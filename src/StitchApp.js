import "bootstrap/dist/css/bootstrap.min.css";
import React, { Component } from "react";
import {
  Stitch,
  FunctionCredential,
  RemoteMongoClient,
} from "mongodb-stitch-browser-sdk";
import Inventory from "./components/Inventory";
import Quarentine from "./components/Quarentine.jsx";

import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom";

class StitchApp extends Component {
  constructor(props) {
    super(props);

    this.appId = props.appId;
    this.db = props.db;
    this.s3bucket = props.s3bucket;
    this.s3serviceName = props.s3serviceName;
    this.StitchServiceName = props.StitchServiceName;

    this.client = Stitch.initializeDefaultAppClient(this.appId);
    this.db = this.client
      .getServiceClient(RemoteMongoClient.factory, this.StitchServiceName)
      .db(this.db);

    const isLoggedIn = this.client.auth.isLoggedIn;
    this.state = {
      isLoggedIn,
    };

    if (isLoggedIn) {
      this.setTechnicalDirectorName();
    }

    this.handleLoginClick = this.handleLoginClick.bind(this);
    this.handleLogoutClick = this.handleLogoutClick.bind(this);
  }

  async setTechnicalDirectorName() {
    const customer = await this.db.collection("customer").findOne({
      stitch_td_uid: this.client.auth.user.id,
    });

    document.getElementById("maintitle").innerText +=
      ", Bienvenido " + customer.technical_director;
  }

  handleLoginClick() {
    this.setState({ isLoggedIn: true });
  }
  handleLogoutClick() {
    this.setState({ isLoggedIn: false });
  }

  render() {
    let { isLoggedIn } = this.state;
    let authDiv;

    if (!isLoggedIn) {
      authDiv = (
        <div>
          <div className="text-center font-weight-bolder rounded bg-light m-5">
            SIGA BPA
          </div>

          <div
            className="card mx-auto"
            style={{ width: "500px", maxWidth: "75%" }}
          >
            <article className="card-body">
              <h4 className="card-title mb-4 mt-1">Director Técnico</h4>

              <div className="form-group">
                <label>Usuario</label>
                <input
                  id="user"
                  className="form-control"
                  type="text"
                  placeholder="usuario"
                ></input>
                <label>Contraseña</label>
                <input
                  id="password"
                  className="form-control"
                  type="password"
                  placeholder="******"
                ></input>
              </div>

              <div
                id="id_alert"
                className="alert alert-warning"
                role="alert"
                style={{ display: "none" }}
                ref={this.alertBox}
              ></div>

              <div className="form-group">
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() => {
                    const alertBox = document.getElementById("id_alert");
                    alertBox.innerHTML = `
                    <div align="center">
                      <div class="spinner-border text-primary" role="status">
                      </div>
                    </div>`;
                    alertBox.style.display = "block";

                    const user = document.getElementById("user").value;
                    const password = document.getElementById("password").value;

                    const technical_director_id = user + "/*.*/" + password;

                    const credential = new FunctionCredential({
                      technical_director_id,
                    });

                    this.client.auth
                      .loginWithCredential(credential)
                      .then(async (authedUser) => {
                        await this.client
                          .callFunction("technical_director_data", [
                            technical_director_id,
                          ])
                          .then(async (customer_id) => {
                            // console.log("Customer id ", customer_id)
                            // console.log("User id ", authedUser.id)
                            this.handleLoginClick();
                            this.setTechnicalDirectorName();
                          })
                          .catch((err) => {
                            alertBox.innerText = err;
                          });
                      })

                      .catch((err) => {
                        alertBox.innerText = err;
                      });
                  }}
                >
                  Ingresar
                </button>
              </div>
            </article>
          </div>
        </div>
      );
    } else {
      authDiv = (
        <div>
          <Router>
            <div className="text-center font-weight-bolder rounded bg-light">
              <div id="maintitle" className="d-inline m-3">
                SIGA BPA
              </div>
              <Link className="btn btn-primary m-3" to="/inventory">
                Inventario
              </Link>
              <Link className="btn btn-primary m-3" to="/quarentine">
                Cuarentena
              </Link>
              <Link
                className="btn btn-danger m-3"
                to="/"
                onClick={() => {
                  this.client.auth.logout().then(() => {
                    this.handleLogoutClick();
                  });
                }}
              >
                Cerrar sesión
              </Link>
            </div>
            <Switch>
              <Route path="/inventory">
                <Inventory client={this.client} db={this.db} />
              </Route>
              <Route path="/quarentine">
                <Quarentine
                  client={this.client}
                  db={this.db}
                  s3bucket={this.s3bucket}
                  appId={this.appId}
                  s3serviceName={this.s3serviceName}
                />
              </Route>
            </Switch>
          </Router>
        </div>
      );
    }

    return <div className="form">{authDiv}</div>;
  }
}

export default StitchApp;
