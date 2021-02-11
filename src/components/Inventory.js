import "bootstrap/dist/css/bootstrap.min.css";
import React, { Component } from "react";

class Inventory extends Component {
  constructor(props) {
    super(props);
    this.client = props.client;
    this.db = props.db;
    this.loadBrands = this.loadBrands.bind(this);
    this.loadProduct = this.loadProduct.bind(this);
    this.loadByFilter = this.loadByFilter.bind(this);
    this.loadSpecs = this.loadSpecs.bind(this);

    this.results_approved = React.createRef();
    this.results_counterSample = React.createRef();
    this.results_quarantine = React.createRef();
    this.results_dispatched = React.createRef();
    this.results_discarded = React.createRef();

    this.locations = React.createRef();
    this.SelectBrands = React.createRef();
    this.statusBar = React.createRef();

    this.lotsRef = React.createRef();
    this.serialNumbersRef = React.createRef();
    this.expDatesRef = React.createRef();
  }

  componentDidMount() {
    this.loadBrands();
  }

  toLocalDate(date, options) {
    return new Date(date).toLocaleDateString("es-PE", options);
  }

  async loadBrands() {
    const customer = await this.db.collection("customer").findOne({
      stitch_td_uid: this.client.auth.user.id,
    });

    this.brands = {};
    let select_product = this.SelectBrands.current;

    let idx = 0;
    for (let product of customer.products) {
      let brand = product.brand;
      let option = document.createElement("option");
      option.appendChild(document.createTextNode(brand));
      option.setAttribute("brand", brand);
      select_product.appendChild(option);
      this.brands[brand] = idx;
      idx++;
    }
    this.loadProduct();
  }

  filterInventory(inventory, filter) {
    if (filter === null) return true;
    if (filter.val === "") return true;
    switch (filter.type) {
      case "lot":
        return inventory.lot === filter.val;
      case "serialNumber":
        return inventory.serial_number === filter.val;
      case "expDate":
        return new Date(inventory.expiration_date) - new Date(filter.val) === 0;
      default:
        return true;
    }
  }

  async loadProduct(filter = null) {
    if (!this.statusBar.current) {
      console.log("statusBar.current not defined");
      return;
    }

    this.statusBar.current.style.display = "block";
    this.statusBar.current.innerText = "Cargando datos";

    const customer = await this.db.collection("customer").findOne({
      stitch_td_uid: this.client.auth.user.id,
    });

    const selectedOption = this.SelectBrands.current.selectedOptions[0];
    const brand = selectedOption.getAttribute("brand");
    if (!brand) {
      console.log("brand not defined");
      return;
    }

    const product_idx = this.brands[brand];
    const product = customer.products[product_idx];

    let tbody_approved = this.results_approved.current;
    tbody_approved.innerHTML = "";
    let tbody_counterSample = this.results_counterSample.current;
    tbody_counterSample.innerHTML = "";
    let tbody_quarantine = this.results_quarantine.current;
    tbody_quarantine.innerHTML = "";
    let tbody_dispatched = this.results_dispatched.current;
    tbody_dispatched.innerHTML = "";
    let tbody_discarded = this.results_discarded.current;
    tbody_discarded.innerHTML = "";

    const approved = product.approved;
    const quarantine = product.quarantine;
    const dispatched = product.dispatched;
    const discarded = product.discarded;
    const counterSample = product.counterSample || [];

    let approved_balance = 0;
    let quarantine_balance = 0;
    let counterSample_balance = 0;
    // let dispatched_balance = 0;
    // let discarded_balance = 0;

    let new_row, new_col;
    for (let inventory of approved) {
      if (!this.filterInventory(inventory, filter)) continue;

      new_row = tbody_approved.insertRow();

      new_col = new_row.insertCell(0);
      new_col.appendChild(document.createTextNode(inventory.provider));

      new_col = new_row.insertCell(1);
      new_col.appendChild(document.createTextNode(inventory.serial_number));

      new_col = new_row.insertCell(2);
      new_col.appendChild(document.createTextNode(inventory.lot));

      new_col = new_row.insertCell(3);

      if (product.features.expiration_date)
        new_col.appendChild(
          document.createTextNode(this.toLocalDate(inventory.expiration_date))
        );

      new_col = new_row.insertCell(4);
      new_col.appendChild(document.createTextNode(inventory.current_quantity));

      approved_balance += parseInt(inventory.current_quantity);
    }
    new_row = tbody_approved.insertRow();
    new_row.insertCell(0);
    new_row.insertCell(1);
    new_row.insertCell(2);

    new_col = new_row.insertCell(3);
    new_col.appendChild(document.createTextNode("TOTAL"));

    new_col = new_row.insertCell(4);
    new_col.appendChild(document.createTextNode(approved_balance));

    for (let inventory of quarantine) {
      if (!this.filterInventory(inventory, filter)) continue;
      new_row = tbody_quarantine.insertRow();

      new_col = new_row.insertCell(0);
      new_col.appendChild(document.createTextNode(inventory.provider));

      new_col = new_row.insertCell(1);
      new_col.appendChild(document.createTextNode(inventory.serial_number));

      new_col = new_row.insertCell(2);
      new_col.appendChild(document.createTextNode(inventory.lot));

      new_col = new_row.insertCell(3);
      new_col.appendChild(
        document.createTextNode(this.toLocalDate(inventory.expiration_date))
      );

      new_col = new_row.insertCell(4);
      new_col.appendChild(document.createTextNode(inventory.current_quantity));

      quarantine_balance += parseInt(inventory.initial_quantity);
    }

    new_row = tbody_quarantine.insertRow();
    new_row.insertCell(0);
    new_row.insertCell(1);
    new_row.insertCell(2);

    new_col = new_row.insertCell(3);
    new_col.appendChild(document.createTextNode("TOTAL"));

    new_col = new_row.insertCell(4);
    new_col.appendChild(document.createTextNode(quarantine_balance));

    for (let inventory of counterSample) {
      if (!this.filterInventory(inventory, filter)) continue;
      new_row = tbody_counterSample.insertRow();

      new_col = new_row.insertCell(0);
      new_col.appendChild(document.createTextNode(inventory.provider));

      new_col = new_row.insertCell(1);
      new_col.appendChild(document.createTextNode(inventory.serial_number));

      new_col = new_row.insertCell(2);
      new_col.appendChild(document.createTextNode(inventory.lot));

      new_col = new_row.insertCell(3);
      if (product.features.expiration_date)
        new_col.appendChild(
          document.createTextNode(this.toLocalDate(inventory.expiration_date))
        );

      new_col = new_row.insertCell(4);
      new_col.appendChild(document.createTextNode(inventory.current_quantity));

      counterSample_balance += parseInt(inventory.current_quantity);
    }

    new_row = tbody_counterSample.insertRow();
    new_row.insertCell(0);
    new_row.insertCell(1);
    new_row.insertCell(2);

    new_col = new_row.insertCell(3);
    new_col.appendChild(document.createTextNode("TOTAL"));

    new_col = new_row.insertCell(4);
    new_col.appendChild(document.createTextNode(counterSample_balance));

    // #########################################################

    let dispatched_acum = 0;
    let discarded_acum = 0;

    for (let inventory of dispatched) {
      if (!this.filterInventory(inventory, filter)) continue;
      new_row = tbody_dispatched.insertRow();
      dispatched_acum += parseInt(inventory.exit_quantity);

      new_col = new_row.insertCell(0);
      new_col.appendChild(document.createTextNode(inventory.provider));

      new_col = new_row.insertCell(1);
      new_col.appendChild(document.createTextNode(inventory.receiver));

      new_col = new_row.insertCell(2);
      new_col.appendChild(document.createTextNode(inventory.lot));

      new_col = new_row.insertCell(3);
      new_col.appendChild(document.createTextNode(inventory.serial_number));

      new_col = new_row.insertCell(4);
      new_col.appendChild(
        document.createTextNode(this.toLocalDate(inventory.expiration_date))
      );

      new_col = new_row.insertCell(5);
      new_col.appendChild(
        document.createTextNode(
          this.toLocalDate(inventory.entry_date, {
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
          })
        )
      );

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

      // Organoléptico
      new_col = new_row.insertCell(9);
      link = document.createElement("a");
      link.innerText = inventory.organoleptic_path ? "Abrir⧉" : "";
      link.target = "_blank";
      link.href = inventory.organoleptic_path;
      new_col.appendChild(link);

      // Otros
      new_col = new_row.insertCell(10);
      link = document.createElement("a");
      link.innerText = inventory.other_file_path ? "Abrir⧉" : "";
      link.target = "_blank";
      link.href = inventory.other_file_path;
      new_col.appendChild(link);

      // Acta de salida
      new_col = new_row.insertCell(11);
      link = document.createElement("a");
      link.innerText = inventory.dispatch_certificate_path ? "Abrir⧉" : "";
      link.target = "_blank";
      link.href = inventory.dispatch_certificate_path;
      new_col.appendChild(link);

      new_col = new_row.insertCell(12);
      new_col.appendChild(document.createTextNode(inventory.exit_quantity));
    }
    new_row = tbody_dispatched.insertRow();
    for (let i = 0; i < 11; i++) new_row.insertCell(i);
    new_col = new_row.insertCell(11);
    new_col.appendChild(document.createTextNode("TOTAL"));

    new_col = new_row.insertCell(12);
    new_col.appendChild(document.createTextNode(dispatched_acum));

    for (let inventory of discarded) {
      if (!this.filterInventory(inventory, filter)) continue;
      new_row = tbody_discarded.insertRow();
      dispatched_acum += parseInt(inventory.exit_quantity);

      new_col = new_row.insertCell(0);
      new_col.appendChild(document.createTextNode(inventory.provider));

      new_col = new_row.insertCell(1);
      new_col.appendChild(document.createTextNode(inventory.lot));

      new_col = new_row.insertCell(2);
      new_col.appendChild(document.createTextNode(inventory.serial_number));

      new_col = new_row.insertCell(3);
      new_col.appendChild(
        document.createTextNode(this.toLocalDate(inventory.expiration_date))
      );

      new_col = new_row.insertCell(4);
      new_col.appendChild(
        document.createTextNode(
          this.toLocalDate(inventory.entry_date, {
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
          })
        )
      );

      new_col = new_row.insertCell(5);
      new_col.appendChild(document.createTextNode(inventory.current_quantity));

      discarded_acum += inventory.current_quantity;
    }

    new_row = tbody_discarded.insertRow();
    new_row.insertCell(0);
    new_row.insertCell(1);
    new_row.insertCell(2);
    new_row.insertCell(3);

    new_col = new_row.insertCell(4);
    new_col.appendChild(document.createTextNode("TOTAL"));

    new_col = new_row.insertCell(5);
    new_col.appendChild(document.createTextNode(discarded_acum));

    this.statusBar.current.style.display = "none";
    this.statusBar.current.innerText = "";

    if (filter === null) this.loadSpecs(product);
  }

  loadSpecs(product) {
    const approved = product.approved || [];
    const quarantine = product.quarantine || [];
    const dispatched = product.dispatched || [];
    const discarded = product.discarded || [];
    const counterSample = product.counterSample || [];

    let lots = new Set();
    let serialNumbers = new Set();
    let expDates = new Set();

    for (const inventory of [
      ...approved,
      ...quarantine,
      ...dispatched,
      ...discarded,
      ...counterSample,
    ]) {
      const { lot, serial_number, expiration_date } = inventory;
      lots.add(lot);
      serialNumbers.add(serial_number);
      expDates.add(expiration_date);
    }

    lots = Array.from(lots).sort();
    serialNumbers = Array.from(serialNumbers).sort();
    expDates = Array.from(expDates).sort();

    serialNumbers = serialNumbers.filter((e) => (e ? 1 : 0));
    expDates = expDates.filter((e) => (e ? 1 : 0));

    lots = ["", ...lots];
    serialNumbers = ["", ...serialNumbers];
    expDates = ["", ...expDates];

    let lotsRef = this.lotsRef.current;
    for (let lot of lots) {
      let option = document.createElement("option");
      option.appendChild(document.createTextNode(lot));
      option.setAttribute("val", lot);
      option.setAttribute("type", "lot");
      lotsRef.appendChild(option);
    }

    let serialNumbersRef = this.serialNumbersRef.current;
    for (let serialNumber of serialNumbers) {
      let option = document.createElement("option");
      option.appendChild(document.createTextNode(serialNumber));
      option.setAttribute("val", serialNumbers);
      option.setAttribute("type", "serialNumbers");
      serialNumbersRef.appendChild(option);
    }

    let expDatesRef = this.expDatesRef.current;
    for (let expDate of expDates) {
      let option = document.createElement("option");
      option.appendChild(
        expDate !== ""
          ? document.createTextNode(this.toLocalDate(expDate), {
              year: "numeric",
              month: "numeric",
              day: "numeric",
            })
          : document.createTextNode("")
      );
      option.setAttribute("val", expDate);
      option.setAttribute("type", "expDate");
      expDatesRef.appendChild(option);
    }
  }

  async loadByFilter(ref) {
    const element = ref.currentTarget;
    const filter = element.options[element.selectedIndex];

    const type = filter.getAttribute("type");
    const val = filter.getAttribute("val");

    switch (type) {
      case "lot": {
        this.serialNumbersRef.current.value = "";
        this.expDatesRef.current.value = "";
        this.loadProduct({ type, val });
        break;
      }
      case "serialNumber": {
        this.lotsRef.current.value = "";
        this.expDatesRef.current.value = "";
        this.loadProduct({ type, val });
        break;
      }
      case "expDate": {
        this.lotsRef.current.value = "";
        this.serialNumbersRef.current.value = "";
        this.loadProduct({ type, val });
        break;
      }
      default:
        break;
    }
  }

  render() {
    return (
      <div className="m-5">
      <h1>Inventario</h1>
        <div className="form-group">
          <div
            className="alert alert-primary"
            role="alert"
            style={{ display: "none" }}
            ref={this.statusBar}
          ></div>
        </div>

        <div className="form-group">
          <label>Producto</label>
          <select
            className="form-control"
            onChange={this.loadProduct}
            ref={this.SelectBrands}
            aria-describedby="brands"
          ></select>
          <label>Lote</label>
          <select
            onChange={this.loadByFilter}
            ref={this.lotsRef}
            className="form-control"
          ></select>
          <label>N° de serie</label>
          <select
            onChange={this.loadByFilter}
            ref={this.serialNumbersRef}
            className="form-control"
          ></select>
          <label>Fecha de vencimiento</label>
          <select
            onChange={this.loadByFilter}
            ref={this.expDatesRef}
            className="form-control"
          ></select>
          {/* <label>Rango: Fecha de entrada</label>
          <select className="form-control"></select>
          <label>Rango: Fecha de salida</label>
          <select className="form-control"></select> */}
        </div>
        <div className="form-group">
          <h4>Aprobados</h4>
          <table className="table table-success">
            <thead>
              <tr>
                <th scope="col">Proveedor</th>
                <th scope="col">N° Serie</th>
                <th scope="col">Lote</th>
                <th scope="col">F.V</th>
                <th scope="col">Saldo</th>
              </tr>
            </thead>
            <tbody ref={this.results_approved}></tbody>
          </table>

          <h4>Cuarentena</h4>
          <table className="table table-warning">
            <thead>
              <tr>
                <th scope="col">Proveedor</th>
                <th scope="col">N° Serie</th>
                <th scope="col">Lote</th>
                <th scope="col">F.V</th>
                <th scope="col">Cantidad de ingreso</th>
              </tr>
            </thead>
            <tbody ref={this.results_quarantine}></tbody>
          </table>

          <h4>Contramuestra</h4>
          <table className="table table-dark">
            <thead>
              <tr>
                <th scope="col">Proveedor</th>
                <th scope="col">N° Serie</th>
                <th scope="col">Lote</th>
                <th scope="col">F.V</th>
                <th scope="col">Saldo</th>
              </tr>
            </thead>
            <tbody ref={this.results_counterSample}></tbody>
          </table>

          <h4>Salida</h4>
          <table className="table table-dark">
            <thead>
              <tr>
                <th scope="col">Proveedor</th>
                <th scope="col">Destinatario</th>
                <th scope="col">Lote</th>
                <th scope="col">N° de Serie</th>
                <th scope="col">Fecha de vencimiento</th>
                <th scope="col">Fecha de ingreso</th>
                <th scope="col">Protocolo de análisis</th>
                <th scope="col">Guía de remisión</th>
                <th scope="col">Acta de recepción</th>
                <th scope="col">Organoléptico</th>
                <th scope="col">Otros</th>
                <th scope="col">Acta de salida</th>
                <th scope="col">Cantidad de salida</th>
              </tr>
            </thead>
            <tbody ref={this.results_dispatched}></tbody>
          </table>

          <h4>Baja</h4>
          <table className="table table-danger">
            <thead>
              <tr>
                <th scope="col">Proveedor</th>
                <th scope="col">Lote</th>
                <th scope="col">N° de Serie</th>
                <th scope="col">Fecha de vencimiento</th>
                <th scope="col">Fecha de ingreso</th>
                <th scope="col">Cantidad dada de baja</th>
              </tr>
            </thead>
            <tbody ref={this.results_discarded}></tbody>
          </table>
        </div>
      </div>
    );
  }
}

export default Inventory;
