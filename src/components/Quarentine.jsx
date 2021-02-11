import "bootstrap/dist/css/bootstrap.min.css";
import React, { Component } from "react";
import { BSON } from "mongodb-stitch-browser-sdk";
import {
  AwsServiceClient,
  AwsRequest,
} from "mongodb-stitch-browser-services-aws";

const checkedInventory = [];
const brands = {};

class Quarentine extends Component {
  constructor(props) {
    super(props);
    this.client = props.client;
    this.db = props.db;
    this.s3bucket = props.s3bucket;
    this.appId = props.appId;
    this.s3serviceName = props.s3serviceName;

    this.loadBrands = this.loadBrands.bind(this);
    this.loadProduct = this.loadProduct.bind(this);
    this.loadEntryDocs = this.loadEntryDocs.bind(this);
    this.loadLots = this.loadLots.bind(this);
    this.loadSerialNumbers = this.loadSerialNumbers.bind(this);
    this.loadExpirationDays = this.loadExpirationDays.bind(this);

    this.saveFile = this.saveFile.bind(this);
    this.approveInventory = this.approveInventory.bind(this);
    this.selectAll = this.selectAll.bind(this);

    this.results_quarantine = React.createRef();
    this.organoleptic = React.createRef();
    this.inventoryCheckbox = React.createRef();
  
    this.SelectBrands = React.createRef();
    this.SelectEntryDocs = React.createRef();
    this.SelectLots = React.createRef();
    this.SelectSerialNumbers = React.createRef();
    this.SelectExpirationDays = React.createRef();

    this.statusBar = React.createRef();

    this.aws = this.client.getServiceClient(
      AwsServiceClient.factory,
      this.s3serviceName
    );
  }

  toLocalDate(date, options) {
    return new Date(date).toLocaleDateString("es-PE", options);
  }

  componentDidMount() {
    this.loadBrands();
  }

  async loadBrands() {
    const customer = await this.db.collection("customer").findOne({
      stitch_td_uid: this.client.auth.user.id,
    });

    let select_product = this.SelectBrands.current;
    let select_entryDocs = this.SelectEntryDocs.current;
    let select_lots = this.SelectLots.current;
    let select_serial_numbers = this.SelectSerialNumbers.current;
    let select_expiration_days = this.SelectExpirationDays.current;

    const entryDocsSet = new Set();
    const lotSet = new Set();
    const serialNumberSet = new Set();
    const expirationDaySet = new Set();

    for (const product of customer.products) {
      for (const { entry_document } of product.quarantine) {
        entryDocsSet.add(entry_document);
      }
    }
    for (const product of customer.products) {
      for (const { lot } of product.quarantine) {
        if(lot !== "")
          lotSet.add(lot);
      }
    } 
    for (const product of customer.products) {
      for (const { serial_number } of product.quarantine) {
        if(serial_number !== "")
          serialNumberSet.add(serial_number);
      }
    }
    for (const product of customer.products) {
      for (const { expiration_date } of product.quarantine) {
        if(expiration_date !== null)
          expirationDaySet.add(this.toLocalDate(expiration_date,{day: "numeric", month: "numeric", year: "numeric"}));
      }
    }

    {
      let option = document.createElement("option");
      option.selected = true;
      option.value = true;
      option.appendChild(document.createTextNode(""));
      option.setAttribute("entry_document", "empty");
      select_entryDocs.appendChild(option);

      const entryDocs = [];
      for (const doc of entryDocsSet) {
        entryDocs.push(doc);
      }
      entryDocs.sort();

      for (const doc of entryDocs) {
        let option = document.createElement("option");
        option.appendChild(document.createTextNode(doc));
        option.setAttribute("entry_document", doc);
        select_entryDocs.appendChild(option);
      }
    }

    {
      let option = document.createElement("option");
      option.selected = true;
      option.value = true;
      option.appendChild(document.createTextNode(""));
      option.setAttribute("lot", "empty");
      select_lots.appendChild(option);

      const lots = [];
      for (const lot of lotSet) {
        lots.push(lot);
      }
      lots.sort();

      for (const lot of lots) {
        let option = document.createElement("option");
        option.appendChild(document.createTextNode(lot));
        option.setAttribute("lot", lot);
        select_lots.appendChild(option);
      }
    }

    {
      let option = document.createElement("option");
      option.selected = true;
      option.value = true;
      option.appendChild(document.createTextNode(""));
      option.setAttribute("serial_number", "empty");
      select_serial_numbers.appendChild(option);

      const serialNumbers = [];
      for (const serialNumber of serialNumberSet) {
        serialNumbers.push(serialNumber);
      }
      serialNumbers.sort();

      for (const serialNumber of serialNumbers) {
        let option = document.createElement("option");
        option.appendChild(document.createTextNode(serialNumber));
        option.setAttribute("serial_number", serialNumber);
        select_serial_numbers.appendChild(option);
      }
    }

    {
      let option = document.createElement("option");
      option.selected = true;
      option.value = true;
      option.appendChild(document.createTextNode(" "));
      option.setAttribute("expiration_date", "empty");
      select_expiration_days.appendChild(option);

      const expirationDays = [];
      for (const expirationDate of expirationDaySet) {
        expirationDays.push(expirationDate);
      }
      expirationDays.sort();

      for (const expirationDate of expirationDays) {
        let option = document.createElement("option");
        option.appendChild(document.createTextNode(expirationDate));
        option.setAttribute("expiration_date", expirationDate);
        select_expiration_days.appendChild(option);
      }
    }

    {
      let option = document.createElement("option");
      option.value = true;
      option.appendChild(document.createTextNode(""));
      option.setAttribute("entry_document", "empty");
      select_product.appendChild(option);

      const prodBrands = [];
      for (let { brand } of customer.products) {
        prodBrands.push(brand);
      }
      prodBrands.sort();

      let idx = 0;
      for (let brand of prodBrands) {
        let option = document.createElement("option");
       //if (idx === 0) option.selected = true;
        option.appendChild(document.createTextNode(brand));
        option.setAttribute("brand", brand);
        select_product.appendChild(option);
        brands[brand] = idx;
        idx++;
      }
      this.loadProduct();
    }
  }

  selectAll() {
    while (checkedInventory.length) {
      checkedInventory.pop();
    }
    for (const inventory of this.inventoryCheckbox.current) {
      inventory.checked = true;
      const brand = inventory.getAttribute("brand");
      const inventory_idx = parseInt(inventory.getAttribute("inventory_idx"));
      checkedInventory.push({ brand, inventory_idx });
    }
  }

  async saveFile() {
    if (this.organoleptic.current.files.length <= 0) return "";
    const makeid = (length) => {
      var result = "";
      var characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      var charactersLength = characters.length;
      for (var i = 0; i < length; i++) {
        result += characters.charAt(
          Math.floor(Math.random() * charactersLength)
        );
      }
      return result;
    };

    const aws = this.aws;
    const s3bucket = this.s3bucket;
    const organoleptic = this.organoleptic.current.files[0];

    let key = makeid(6) + "_" + organoleptic.name;
    let url = `http://${this.s3bucket}.s3.amazonaws.com/${encodeURIComponent(
      key
    )}`;

    const reader = new FileReader();
    reader.onload = async function (ev) {
      const result = ev.target.result;
      const array = new Buffer(result);
      const body = new BSON.Binary(array);
      const args = {
        ACL: "public-read",
        Bucket: s3bucket,
        ContentType: organoleptic.type,
        Key: key,
        Body: body,
      };
      const request = await new AwsRequest.Builder()
        .withService("s3")
        .withAction("PutObject")
        .withRegion("sa-east-1")
        .withArgs(args);
      aws.execute(request.build());
    };
    await reader.readAsArrayBuffer(organoleptic);

    this.organoleptic.current.value = "";
    return url;
  }

  async loadProduct() {
    if (!this.statusBar.current) return;

    if (!this.SelectBrands.current) {
      throw Object.assign(new Error("SelectBrands.current not defined"));
    }

    const selectedOption = this.SelectBrands.current.selectedOptions[0];
    const brand = selectedOption.getAttribute("brand");
    const product_idx = brands[brand];

    if (product_idx === undefined) {
      //TODO: Revisar la funcion de return aqui
      this.loadEntryDocs();
      this.loadLots();
      this.loadSerialNumbers();
      return;
    }
    this.SelectSerialNumbers.current[0].selected =true;
    this.SelectEntryDocs.current[0].selected = true;
    this.SelectLots.current[0].selected = true;
    this.SelectExpirationDays.current[0].selected = true;

    this.statusBar.current.style.display = "block";
    this.statusBar.current.innerText = "Cargando datos";
    this.inventoryCheckbox.current = [];

    const customer = await this.db.collection("customer").findOne({
      stitch_td_uid: this.client.auth.user.id,
    });

    const product = customer.products[product_idx];
    const { generic_name } = product;

    let tbody_quarantine = this.results_quarantine.current;
    tbody_quarantine.innerHTML = "";

    let quarantine_balance = 0;
    let new_row, new_col;

    const quarantine = [];
    let idx = 0;
    for (let inventory of product.quarantine) {
      inventory.sanitary_registry = product.sanitary_registry;
      inventory.inventory_idx = idx;
      quarantine.push(inventory);
      idx++;
    }

    for (let inventory of quarantine) {
      const { inventory_idx } = inventory;
      new_row = tbody_quarantine.insertRow();

      // Nombre del Producto
      const name = `${brand}, ${generic_name}`;
      new_col = new_row.insertCell(0);
      new_col.appendChild(document.createTextNode(name));

     //Registro Sanitario
      new_col = new_row.insertCell(1);
      new_col.appendChild(document.createTextNode(inventory.sanitary_registry));

      // N° de Serie
      new_col = new_row.insertCell(2);
      new_col.appendChild(document.createTextNode(inventory.serial_number));

      // Lote
      new_col = new_row.insertCell(3);
      new_col.appendChild(document.createTextNode(inventory.lot));

      // Fecha de vencimiento
      new_col = new_row.insertCell(4);
      if(inventory.expiration_date !== null){
        new_col.appendChild(
          document.createTextNode(
            this.toLocalDate(inventory.expiration_date, {
              year: "numeric",
              month: "numeric",
              day: "numeric"
            })
          )
        );
      }else{
        new_col.appendChild(document.createTextNode(" "));
      }

      // Cantidad de ingreso
      new_col = new_row.insertCell(5);
      new_col.appendChild(document.createTextNode(inventory.initial_quantity));

      // Protocolo de análisis
      new_col = new_row.insertCell(6);
      let link = document.createElement("a");
      link.innerText = inventory.analysis_protocol_path ? "Abrir⧉" : "";
      link.target = "_blank";
      link.href = inventory.analysis_protocol_path;
      new_col.appendChild(link);

      // Guía de remisión
      new_col = new_row.insertCell(7);
      link = document.createElement("a");
      link.innerText = inventory.referral_guide_path ? "Abrir⧉" : "";
      link.target = "_blank";
      link.href = inventory.referral_guide_path;
      new_col.appendChild(link);

      // Acta de recepción
      new_col = new_row.insertCell(8);
      link = document.createElement("a");
      link.innerText = inventory.receipt_certificate_path ? "Abrir⧉" : "";
      link.target = "_blank";
      link.href = inventory.receipt_certificate_path;
      new_col.appendChild(link);

      // Seleccionar
      new_col = new_row.insertCell(9);
      let check_box = document.createElement("input");
      check_box.type = "checkbox";
      check_box.setAttribute("brand", brand);
      check_box.setAttribute("inventory_idx", inventory_idx);
      check_box.className = "form-check-input";
      check_box.onchange = function (ev) {
        let element = ev.target;
        if (element.checked === true) {
          checkedInventory.push({
            brand,
            inventory_idx,
          });
        } else {
          let del = -1;
          for (let i = 0; i < checkedInventory.length; i++) {
            if (
              checkedInventory[i].brand === brand &&
              checkedInventory[i].inventory_idx === inventory_idx
            ) {
              del = i;
              break;
            }
          }
          if (del !== -1) {
            checkedInventory.splice(del, 1);
          }
        }
      };
      this.inventoryCheckbox.current.push(check_box);
      new_col.appendChild(check_box);
      quarantine_balance += inventory.initial_quantity;
    }

    new_row = tbody_quarantine.insertRow();
    new_col = new_row.insertCell(0);
    new_col.appendChild(document.createTextNode("TOTAL"));
    new_col = new_row.insertCell(1);
    new_col.appendChild(document.createTextNode(quarantine_balance));

    this.statusBar.current.style.display = "none";
    this.statusBar.current.innerText = "";
  }
  //DOCUMENTO DE ENTRADA (DUA, etc)
  async loadEntryDocs() {
    if (!this.statusBar.current) return;
    //EN ESTA PARTE SE SETEA DE NUEVO PARA BORRAR LAS BUSQUEDAS PASADAS CON LAS SS 2 LINES
    this.SelectBrands.current[0].selected = true;
    this.SelectLots.current[0].selected = true;
    this.SelectSerialNumbers.current[0].selected =true;
    this.SelectExpirationDays.current[0].selected = true;
    // aca termina el select
    this.statusBar.current.style.display = "block";
    this.statusBar.current.innerText = "Cargando datos";
    this.inventoryCheckbox.current = [];

    const customer = await this.db.collection("customer").findOne({
      stitch_td_uid: this.client.auth.user.id,
    });

    if (!this.SelectEntryDocs.current) {
      throw Object.assign(new Error("SelectEntryDocs.current not defined"));
    }

    const selectedOption = this.SelectEntryDocs.current.selectedOptions[0];
    const entry_document = selectedOption.getAttribute("entry_document");

    const quarantine = [];
    for (const product of customer.products) {
      let idx = 0;
      for (const inventory of product.quarantine) {
        if (inventory.entry_document === entry_document) {
          inventory.brand = product.brand;
          inventory.generic_name = product.generic_name;
          inventory.sanitary_registry = product.sanitary_registry;
          inventory.inventory_idx = idx;
          quarantine.push(inventory);
        }
        idx++;
      }
    }

    let tbody_quarantine = this.results_quarantine.current;
    tbody_quarantine.innerHTML = "";

    let quarantine_balance = 0;
    let new_row, new_col;

    for (let inventory of quarantine) {
      new_row = tbody_quarantine.insertRow();

      // Nombre del Producto
      const { brand, generic_name, inventory_idx } = inventory;
      const name = `${brand}, ${generic_name}`;
      new_col = new_row.insertCell(0);
      new_col.appendChild(document.createTextNode(name));

      /*//TODO: Proovedor quitado temporalmente 
      // Proveedor
      new_col = new_row.insertCell(1);
      new_col.appendChild(document.createTextNode(inventory.provider));
      */
      //N° de Registro Sanitario 
      new_col = new_row.insertCell(1);
      new_col.appendChild(document.createTextNode(inventory.sanitary_registry));

      // N° de serie
      new_col = new_row.insertCell(2);
      new_col.appendChild(document.createTextNode(inventory.serial_number));

       // Lote
       new_col = new_row.insertCell(3);
       new_col.appendChild(document.createTextNode(inventory.lot));

      // Fecha de vencimiento
      new_col = new_row.insertCell(4);
      if(inventory.expiration_date !== null){
        new_col.appendChild(
          document.createTextNode(
            this.toLocalDate(inventory.expiration_date, {
              year: "numeric",
              month: "numeric",
              day: "numeric"
            })
          )
        );
      }else{
        new_col.appendChild(document.createTextNode(" "));
      }
     

      // Cantidad inicial
      new_col = new_row.insertCell(5);
      new_col.appendChild(document.createTextNode(inventory.initial_quantity));

      // Protocolo de análisis
      new_col = new_row.insertCell(6);
      let link = document.createElement("a");
      link.innerText = inventory.analysis_protocol_path ? "Abrir⧉" : "";
      link.target = "_blank";
      link.href = inventory.analysis_protocol_path;
      new_col.appendChild(link);

      // Guía de remisión
      new_col = new_row.insertCell(7);
      link = document.createElement("a");
      link.innerText = inventory.referral_guide_path ? "Abrir⧉" : "";
      link.target = "_blank";
      link.href = inventory.referral_guide_path;
      new_col.appendChild(link);

      // Acta de recepción
      new_col = new_row.insertCell(8);
      link = document.createElement("a");
      link.innerText = inventory.receipt_certificate_path ? "Abrir⧉" : "";
      link.target = "_blank";
      link.href = inventory.receipt_certificate_path;
      new_col.appendChild(link);

      // Seleccionar
      new_col = new_row.insertCell(9);
      let check_box = document.createElement("input");
      check_box.type = "checkbox";
      check_box.className = "form-check-input";
      check_box.setAttribute("brand", brand);
      check_box.setAttribute("inventory_idx", inventory_idx);
      check_box.onchange = function (ev) {
        let element = ev.target;
        if (element.checked === true) {
          checkedInventory.push({ brand, inventory_idx });
        } else {
          let del = -1;
          for (let i = 0; i < checkedInventory.length; i++) {
            if (
              checkedInventory[i].brand === brand &&
              checkedInventory[i].inventory_idx === inventory_idx
            ) {
              del = i;
              break;
            }
          }
          if (del !== -1) {
            checkedInventory.splice(del, 1);
          }
        }
      };
      this.inventoryCheckbox.current.push(check_box);
      new_col.appendChild(check_box);
      quarantine_balance += inventory.initial_quantity;
    }

    new_row = tbody_quarantine.insertRow();
    new_col = new_row.insertCell(0);
    new_col.appendChild(document.createTextNode("TOTAL"));
    new_col = new_row.insertCell(1);
    new_col.appendChild(document.createTextNode(quarantine_balance));

    this.statusBar.current.style.display = "none";
    this.statusBar.current.innerText = "";
  }

  async loadLots() {
    if (!this.statusBar.current) return;

    this.SelectBrands.current[0].selected = true;
    this.SelectSerialNumbers.current[0].selected = true;
    this.SelectEntryDocs.current[0].selected = true;
    this.SelectExpirationDays.current[0].selected = true;

    this.statusBar.current.style.display = "block";
    this.statusBar.current.innerText = "Cargando datos";
    this.inventoryCheckbox.current = [];

    const customer = await this.db.collection("customer").findOne({
      stitch_td_uid: this.client.auth.user.id,
    });

    if (!this.SelectLots.current) {
      throw Object.assign(new Error("SelectLots.current not defined"));
    }

    const selectedOption = this.SelectLots.current.selectedOptions[0];
    const lot = selectedOption.getAttribute("lot");

    const quarantine = [];
    for (const product of customer.products) {
      let idx = 0;
      for (const inventory of product.quarantine) {
        if (inventory.lot === lot) {
          inventory.brand = product.brand;
          inventory.generic_name = product.generic_name;
          inventory.sanitary_registry = product.sanitary_registry;
          inventory.inventory_idx = idx;
          quarantine.push(inventory);
        }
        idx++;
      }
    }

    let tbody_quarantine = this.results_quarantine.current;
    tbody_quarantine.innerHTML = "";

    let quarantine_balance = 0;
    let new_row, new_col;

    for (let inventory of quarantine) {
      new_row = tbody_quarantine.insertRow();

      // Nombre del Producto
      const { brand, generic_name, inventory_idx } = inventory;
      const name = `${brand}, ${generic_name}`;
      new_col = new_row.insertCell(0);
      new_col.appendChild(document.createTextNode(name));

      /*//TODO: Proovedor quitado temporalmente 
      // Proveedor
      new_col = new_row.insertCell(1);
      new_col.appendChild(document.createTextNode(inventory.provider));
      */
      //N° de Registro Sanitario 
      new_col = new_row.insertCell(1);
      new_col.appendChild(document.createTextNode(inventory.sanitary_registry));

      // N° de serie
      new_col = new_row.insertCell(2);
      new_col.appendChild(document.createTextNode(inventory.serial_number));

       // Lote
       new_col = new_row.insertCell(3);
       new_col.appendChild(document.createTextNode(inventory.lot));

      // Fecha de vencimiento
      new_col = new_row.insertCell(4);
      if(inventory.expiration_date !== null){
        new_col.appendChild(
          document.createTextNode(
            this.toLocalDate(inventory.expiration_date, {
              year: "numeric",
              month: "numeric",
              day: "numeric"
            })
          )
        );
      }else{
        new_col.appendChild(document.createTextNode(" "));
      }
     

      // Cantidad inicial
      new_col = new_row.insertCell(5);
      new_col.appendChild(document.createTextNode(inventory.initial_quantity));

      // Protocolo de análisis
      new_col = new_row.insertCell(6);
      let link = document.createElement("a");
      link.innerText = inventory.analysis_protocol_path ? "Abrir⧉" : "";
      link.target = "_blank";
      link.href = inventory.analysis_protocol_path;
      new_col.appendChild(link);

      // Guía de remisión
      new_col = new_row.insertCell(7);
      link = document.createElement("a");
      link.innerText = inventory.referral_guide_path ? "Abrir⧉" : "";
      link.target = "_blank";
      link.href = inventory.referral_guide_path;
      new_col.appendChild(link);

      // Acta de recepción
      new_col = new_row.insertCell(8);
      link = document.createElement("a");
      link.innerText = inventory.receipt_certificate_path ? "Abrir⧉" : "";
      link.target = "_blank";
      link.href = inventory.receipt_certificate_path;
      new_col.appendChild(link);

      // Seleccionar
      new_col = new_row.insertCell(9);
      let check_box = document.createElement("input");
      check_box.type = "checkbox";
      check_box.className = "form-check-input";
      check_box.setAttribute("brand", brand);
      check_box.setAttribute("inventory_idx", inventory_idx);
      check_box.onchange = function (ev) {
        let element = ev.target;
        if (element.checked === true) {
          checkedInventory.push({ brand, inventory_idx });
        } else {
          let del = -1;
          for (let i = 0; i < checkedInventory.length; i++) {
            if (
              checkedInventory[i].brand === brand &&
              checkedInventory[i].inventory_idx === inventory_idx
            ) {
              del = i;
              break;
            }
          }
          if (del !== -1) {
            checkedInventory.splice(del, 1);
          }
        }
      };
      this.inventoryCheckbox.current.push(check_box);
      new_col.appendChild(check_box);
      quarantine_balance += inventory.initial_quantity;
    }

    new_row = tbody_quarantine.insertRow();
    new_col = new_row.insertCell(0);
    new_col.appendChild(document.createTextNode("TOTAL"));
    new_col = new_row.insertCell(1);
    new_col.appendChild(document.createTextNode(quarantine_balance));

    this.statusBar.current.style.display = "none";
    this.statusBar.current.innerText = "";
  }

  async loadSerialNumbers(){
    if (!this.statusBar.current) return;

    this.SelectBrands.current[0].selected = true;
    this.SelectEntryDocs.current[0].selected = true;
    this.SelectLots.current[0].selected = true;
    this.SelectExpirationDays.current[0].selected = true;

    this.statusBar.current.style.display = "block";
    this.statusBar.current.innerText = "Cargando datos";
    this.inventoryCheckbox.current = [];

    const customer = await this.db.collection("customer").findOne({
      stitch_td_uid: this.client.auth.user.id,
    });

    if (!this.SelectSerialNumbers.current) {
      throw Object.assign(new Error("SelectSerialNumbers.current not defined"));
    }

    const selectedOption = this.SelectSerialNumbers.current.selectedOptions[0];
    const serialNumber = selectedOption.getAttribute("serial_number");

    const quarantine = [];
    for (const product of customer.products) {
      let idx = 0;
      for (const inventory of product.quarantine) {
        if (inventory.serial_number === serialNumber) {
          inventory.brand = product.brand;
          inventory.generic_name = product.generic_name;
          inventory.sanitary_registry = product.sanitary_registry;
          inventory.inventory_idx = idx;
          quarantine.push(inventory);
        }
        idx++;
      }
    }

    let tbody_quarantine = this.results_quarantine.current;
    tbody_quarantine.innerHTML = "";

    let quarantine_balance = 0;
    let new_row, new_col;
    for (let inventory of quarantine) {
      new_row = tbody_quarantine.insertRow();

      // Nombre del Producto
      const { brand, generic_name, inventory_idx } = inventory;
      const name = `${brand}, ${generic_name}`;
      new_col = new_row.insertCell(0);
      new_col.appendChild(document.createTextNode(name));

      /*//TODO: Proovedor quitado temporalmente 
      // Proveedor
      new_col = new_row.insertCell(1);
      new_col.appendChild(document.createTextNode(inventory.provider));
      */
      //N° de Registro Sanitario 
      new_col = new_row.insertCell(1);
      new_col.appendChild(document.createTextNode(inventory.sanitary_registry));

      // N° de serie
      new_col = new_row.insertCell(2);
      new_col.appendChild(document.createTextNode(inventory.serial_number));

       // Lote
       new_col = new_row.insertCell(3);
       new_col.appendChild(document.createTextNode(inventory.lot));

      // Fecha de vencimiento
      new_col = new_row.insertCell(4);
      if(inventory.expiration_date !== null){
        new_col.appendChild(
          document.createTextNode(
            this.toLocalDate(inventory.expiration_date, {
              year: "numeric",
              month: "numeric",
              day: "numeric"
            })
          )
        );
      }else{
        new_col.appendChild(document.createTextNode(" "));
      }
     

      // Cantidad inicial
      new_col = new_row.insertCell(5);
      new_col.appendChild(document.createTextNode(inventory.initial_quantity));

      // Protocolo de análisis
      new_col = new_row.insertCell(6);
      let link = document.createElement("a");
      link.innerText = inventory.analysis_protocol_path ? "Abrir⧉" : "";
      link.target = "_blank";
      link.href = inventory.analysis_protocol_path;
      new_col.appendChild(link);

      // Guía de remisión
      new_col = new_row.insertCell(7);
      link = document.createElement("a");
      link.innerText = inventory.referral_guide_path ? "Abrir⧉" : "";
      link.target = "_blank";
      link.href = inventory.referral_guide_path;
      new_col.appendChild(link);

      // Acta de recepción
      new_col = new_row.insertCell(8);
      link = document.createElement("a");
      link.innerText = inventory.receipt_certificate_path ? "Abrir⧉" : "";
      link.target = "_blank";
      link.href = inventory.receipt_certificate_path;
      new_col.appendChild(link);

      // Seleccionar
      new_col = new_row.insertCell(9);
      let check_box = document.createElement("input");
      check_box.type = "checkbox";
      check_box.className = "form-check-input";
      check_box.setAttribute("brand", brand);
      check_box.setAttribute("inventory_idx", inventory_idx);
      check_box.onchange = function (ev) {
        let element = ev.target;
        if (element.checked === true) {
          checkedInventory.push({ brand, inventory_idx });
        } else {
          let del = -1;
          for (let i = 0; i < checkedInventory.length; i++) {
            if (
              checkedInventory[i].brand === brand &&
              checkedInventory[i].inventory_idx === inventory_idx
            ) {
              del = i;
              break;
            }
          }
          if (del !== -1) {
            checkedInventory.splice(del, 1);
          }
        }
      };
      this.inventoryCheckbox.current.push(check_box);
      new_col.appendChild(check_box);
      quarantine_balance += inventory.initial_quantity;
    }

    new_row = tbody_quarantine.insertRow();
    new_col = new_row.insertCell(0);
    new_col.appendChild(document.createTextNode("TOTAL"));
    new_col = new_row.insertCell(1);
    new_col.appendChild(document.createTextNode(quarantine_balance));

    this.statusBar.current.style.display = "none";
    this.statusBar.current.innerText = "";
  }

  async loadExpirationDays(){
    if (!this.statusBar.current) return;

    this.SelectBrands.current[0].selected = true;
    this.SelectEntryDocs.current[0].selected = true;
    this.SelectLots.current[0].selected = true;
    this.SelectSerialNumbers.current[0].selected = true;

    this.statusBar.current.style.display = "block";
    this.statusBar.current.innerText = "Cargando datos";
    this.inventoryCheckbox.current = [];

    const customer = await this.db.collection("customer").findOne({
      stitch_td_uid: this.client.auth.user.id,
    });

    if (!this.SelectExpirationDays.current) {
      throw Object.assign(new Error("SelectExpirationDays.current not defined"));
    }

    const selectedOption = this.SelectExpirationDays.current.selectedOptions[0];
    const expirationDate = selectedOption.getAttribute("expiration_date");

    const quarantine = [];
    for (const product of customer.products) {
      let idx = 0;
      for (const inventory of product.quarantine) {
        if (this.toLocalDate(inventory.expiration_date,{day: "numeric", month: "numeric", year: "numeric"}) === expirationDate) {
          inventory.brand = product.brand;
          inventory.generic_name = product.generic_name;
          inventory.sanitary_registry = product.sanitary_registry;
          inventory.inventory_idx = idx;
          quarantine.push(inventory);
        }
        idx++;
      }
    }

    let tbody_quarantine = this.results_quarantine.current;
    tbody_quarantine.innerHTML = "";

    let quarantine_balance = 0;
    let new_row, new_col;

    for (let inventory of quarantine) {
      new_row = tbody_quarantine.insertRow();

       // Nombre del Producto
       const { brand, generic_name, inventory_idx } = inventory;
       const name = `${brand}, ${generic_name}`;
       new_col = new_row.insertCell(0);
       new_col.appendChild(document.createTextNode(name));
 
       /*//TODO: Proovedor quitado temporalmente 
       // Proveedor
       new_col = new_row.insertCell(1);
       new_col.appendChild(document.createTextNode(inventory.provider));
       */
       //N° de Registro Sanitario 
       new_col = new_row.insertCell(1);
       new_col.appendChild(document.createTextNode(inventory.sanitary_registry));
 
       // N° de serie
       new_col = new_row.insertCell(2);
       new_col.appendChild(document.createTextNode(inventory.serial_number));
 
        // Lote
        new_col = new_row.insertCell(3);
        new_col.appendChild(document.createTextNode(inventory.lot));
 
       // Fecha de vencimiento
       new_col = new_row.insertCell(4);
       if(inventory.expiration_date !== null){
         new_col.appendChild(
           document.createTextNode(
             this.toLocalDate(inventory.expiration_date, {
               year: "numeric",
               month: "numeric",
               day: "numeric"
             })
           )
         );
       }else{
         new_col.appendChild(document.createTextNode(" "));
       }
      
 
       // Cantidad inicial
       new_col = new_row.insertCell(5);
       new_col.appendChild(document.createTextNode(inventory.initial_quantity));
 
       // Protocolo de análisis
       new_col = new_row.insertCell(6);
       let link = document.createElement("a");
       link.innerText = inventory.analysis_protocol_path ? "Abrir⧉" : "";
       link.target = "_blank";
       link.href = inventory.analysis_protocol_path;
       new_col.appendChild(link);
 
       // Guía de remisión
       new_col = new_row.insertCell(7);
       link = document.createElement("a");
       link.innerText = inventory.referral_guide_path ? "Abrir⧉" : "";
       link.target = "_blank";
       link.href = inventory.referral_guide_path;
       new_col.appendChild(link);
 
       // Acta de recepción
       new_col = new_row.insertCell(8);
       link = document.createElement("a");
       link.innerText = inventory.receipt_certificate_path ? "Abrir⧉" : "";
       link.target = "_blank";
       link.href = inventory.receipt_certificate_path;
       new_col.appendChild(link);

      // Seleccionar
      new_col = new_row.insertCell(9);
      let check_box = document.createElement("input");
      check_box.type = "checkbox";
      check_box.className = "form-check-input";
      check_box.setAttribute("brand", brand);
      check_box.setAttribute("inventory_idx", inventory_idx);
      check_box.onchange = function (ev) {
        let element = ev.target;
        if (element.checked === true) {
          checkedInventory.push({ brand, inventory_idx });
        } else {
          let del = -1;
          for (let i = 0; i < checkedInventory.length; i++) {
            if (
              checkedInventory[i].brand === brand &&
              checkedInventory[i].inventory_idx === inventory_idx
            ) {
              del = i;
              break;
            }
          }
          if (del !== -1) {
            checkedInventory.splice(del, 1);
          }
        }
      };
      this.inventoryCheckbox.current.push(check_box);
      new_col.appendChild(check_box);
      quarantine_balance += inventory.initial_quantity;
    }

    new_row = tbody_quarantine.insertRow();
    new_col = new_row.insertCell(0);
    new_col.appendChild(document.createTextNode("TOTAL"));
    new_col = new_row.insertCell(1);
    new_col.appendChild(document.createTextNode(quarantine_balance));

    this.statusBar.current.style.display = "none";
    this.statusBar.current.innerText = "";
  }

  async approveInventory() {
    if (checkedInventory.length === 0) return;

    const approved = {};
    for (const { brand, inventory_idx } of checkedInventory) {
      if (approved.hasOwnProperty(brand)) {
        approved[brand].push(inventory_idx);
      } else {
        approved[brand] = [inventory_idx];
      }
    }

    const customer = await this.db.collection("customer").findOne({
      stitch_td_uid: this.client.auth.user.id,
    });

    const organoleptic_path = await this.saveFile();

    for (const [brand, indexes] of Object.entries(approved)) {
      const product_idx = brands[brand];

      for (let i = 0; i < indexes.length; i++) {
        const idx = indexes[i];
        const inventory = customer.products[product_idx].quarantine[idx];

        customer.products[product_idx].quarantine.splice(idx, 1);
        inventory.organoleptic_path = organoleptic_path;
        customer.products[product_idx].approved.push(inventory);

        for (let j = i + 1; j < indexes.length; j++) {
          if (idx < indexes[j]) {
            indexes[j]--;
          }
        }
      }
    }

    await this.db.collection("customer").updateOne(
      {
        stitch_td_uid: this.client.auth.user.id,
      },
      customer
    );
    this.loadProduct();
  }

  render() {
    return (
      <div className="m-5">
        
        <h1>Cuarentena</h1>

        <div className="form-group">
          <div
            className="alert alert-primary"
            role="alert"
            style={{ display: "none" }}
            ref={this.statusBar}
          ></div>
        </div>

        <div className="form-group">
          <label>Documento de ingreso</label>
          <select
            className="form-control"
            onChange={this.loadEntryDocs}
            ref={this.SelectEntryDocs}
            // aria-describedby="entry_document"
          ></select>
        </div>

        <div className="form-group">
          <label>Producto</label>
          <select
            className="form-control"
            onChange={this.loadProduct}
            ref={this.SelectBrands}
            aria-describedby="product"
          ></select>
        </div>

        <div className="form-group">
          <label>Lote</label>
          <select
            className="form-control"
            onChange={this.loadLots}
            ref={this.SelectLots}
          ></select>
        </div>

        <div className="form-group">
          <label>Serie</label>
          <select
            className="form-control"
            onChange={this.loadSerialNumbers}
            ref={this.SelectSerialNumbers}
          ></select>
        </div>

        <div className="form-group">
          <label>Fecha de Vencimiento</label>
          <select
            className="form-control"
            onChange={this.loadExpirationDays}
            ref={this.SelectExpirationDays}
          ></select>
        </div>

        <div className="form-group">
          <table className="table table-warning text-center">
            <thead>
              <tr>
                <th scope="col">Producto</th>

                <th scope="col">N° de Registro Sanitario</th>
                <th scope="col">N° de serie</th>
                <th scope="col">Lote</th>
                <th scope="col">Fecha de vencimiento</th>
                <th scope="col">Cantidad de ingreso</th>
                <th scope="col">Protocolo de análisis</th>
                <th scope="col">Guía de remisión</th>
                <th scope="col">Acta de recepción</th>
                <th scope="col">
                  <button className="btn btn-success" onClick={this.selectAll}>
                    Seleccionar todo
                  </button>
                </th>
              </tr>
            </thead>
            <tbody ref={this.results_quarantine}></tbody>
          </table>
          <div className="form-group">
            <label>Adjuntar Organléptico</label>
            <input
              type="file"
              className="form-control-file"
              ref={this.organoleptic}
            ></input>
            <button
              onClick={this.approveInventory}
              className="btn btn-success m-3"
            >
              Aprobar
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default Quarentine;
