const sqlite3 = require('sqlite3').verbose();

let db = new sqlite3.Database('./atca.db', sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error(err.message);
  }
  // console.log('Connected to the atca database.');
});


function getRNC() {
  let sql = `select cnhost from cellsite where side='L' and cell='9999'`;
  let cnhost;
  return db.get(sql, (err, row) => {
    if (err) {
      return console.error(err.message);
    }
    cnhost = row.cnhost;
    console.log(row.cnhost);
    return cnhost;
  });
}
let rnc = getRNC();
console.log(rnc);

//
// function getCN() {
//   db.serialize( () => {
//     let cnhost;
//     return db.each(`select cnhost from cellsite where side='L' and cell='9999'`, (err, row) => {
//       if (err) {
//         console.error(err.message);
//       }
//       cnhost = row.cnhost;
//       console.log("CN1 = " + cnhost);
//       return cnhost;
//     });
//   });
// }
// let cn2 = () => getCN();
// console.log("CN2 = " + cn2());
//
//
//


db.close((err) => {
  if (err) {
    console.error(err.message);
  }
  // console.log('Close the database connection.');
});
