"use strict";

const hbs = require("hbs");

module.exports = (divID) => {

console.log(divID);

  let res = "";
  if (divID == "request") {
    res = `<div id=${divID}> style="background: #D8BFD8;"`;
  }
  else if (divID == "discover") {
    res = `<div id=${divID}> style="background: #FFFF00;"`;
  }
  else if (divID == "offer") {
    res = `<div id=${divID}> style="background: #00FFFF;"`;
  }
  else if (divID == "ack") {
    res = `<div id=${divID}> style="background: #00FF00;"`;
  }
  return new hbs.SafeString(res);
}
