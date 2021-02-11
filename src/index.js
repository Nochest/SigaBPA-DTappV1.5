import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import StitchApp from "./StitchApp";
import * as serviceWorker from "./serviceWorker";

ReactDOM.render( <
  StitchApp s3bucket = "siga-app"
  s3serviceName = "aws_s3_siga_files"
  StitchServiceName = "mongodb-atlas"
  // TEST
  //appId="sigaapptest-gucyv"
  //db="test"

  // A
  // appId = "sigaapp-a-trruz"
  // db = "siga-a"

  // B
  // appId="sigaapp-b-cyuju"
  // db="siga-b"
  
  // V1.5
  appId= "sigaapptest1-5-lddsu"
  db = "test"
  /
  >
  ,
  document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();