/*
 Copyright (c) 2015 Kilian Ulrichsohn

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
 rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
 persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial
 portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
 WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT
 OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var testdb = null;

function init() {
    window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    var request = window.indexedDB.open("test", 1);
    request.onsuccess = function(e) {
        testdb = e.target.result;
    };
    request.onupgradeneeded = upgrade;
    request.onerror = function() {
        console.log("Datenbank konnte nicht geladen werden");
    }
}
function upgrade(e) {
    var _idb = e.target.result;
    QDBUtilities.upgradeDatabase(_idb, [
        {name: "Artikel",               keyPath: "ID", autoIncrement: true, keys:["Bezeichnung", "Preis"]},
        {name: "Rechnung",              keyPath: "ID", autoIncrement: true, keys:["BenutzerID", "Datum"]},
        {name: "ArtikelZuRechnung",     keyPath: "ID", autoIncrement: true, keys:["RechnungID", "ArtikelID", "Anzahl"]},
        {name: "Benutzer",              keyPath: "ID", autoIncrement: true, keys:["Vorname", "Nachname", "Geburtstag", "Email"]}
    ]);
}
function insert() {
    var counter = new QDBCounter();
    var stat = document.getElementById("stat");
    counter.onTick(function(){
        stat.innerHTML = "Verstrichene Zeit: " + counter.getSeconds() + "s Fortschritt: " + (counter.progressPercent() * 100).toFixed(1) + "%";
    });
    counter.onFinish(function() {
        stat.innerHTML = "Verstrichene Zeit: " + counter.getSeconds() + "s Fertig.";
    });
    var i = new QDBInsert(testdb);
    i.insert(testdata, counter);
}
function dropDB() {
    testdb.close();
    window.indexedDB.deleteDatabase("test");
    location.reload();
}
function query1() {
    var q = new QDBQuery(testdb);
    q.onFinish(function(){
        var stat = document.getElementById("stat");
        stat.innerHTML = renderAsTable(q.result, 100);
    });
    q.join("Benutzer", {"Rechnung": {pk: "BenutzerID", fk: "ID", stack: true, keys: [{name: "ID", as: "AnzahlBestellungen", func: "count"}]}}, {});
}
function query2() {
    var q = new QDBQuery(testdb);
    var c = new QDBCounter();
    var stat = document.getElementById("stat");
    var result = document.getElementById("result");
    c.add();
    c.onTick(function(){
        stat.innerHTML = "Verstrichene Zeit: " + counter.getSeconds() + "s Fortschritt: " + counter.progressPercent() + "%";
    });
    c.onFinish(function() {
        stat.innerHTML = "Verstrichene Zeit: " + counter.getSeconds() + "s Fertig.";
    });
    q.onFinish(function(){
        result.innerHTML = renderAsTable(q.result, 100);
        c.finishedOperation();
    });
    q.join("Benutzer", {"Rechnung": {pk: "BenutzerID", fk: "ID", stack: true, keys: [{name: "Anzahl", as: "AnzahlBestellterArtikel", func: "sum"}]}}, {});
}
function renderAsTable(data, max) {
    if(data.length > 0) {
        var innerTHead = "";
        var innerTBody = "";
        var header = [];
        for(var storename in data[0]) {
            innerTHead += "<td>";
            innerTHead += storename;
            innerTHead += "</td>";
            header.push(storename);
        }
        var m = (max > data.length) ? data.length : max;
        for(var i = 0; i < m; i++) {
            innerTBody += "<tr>";
            for(var j in header) {
                innerTBody += "<td>";
                innerTBody += data[i][header[j]];
                innerTBody += "</td>";
            }
            innerTBody += "</tr>";
        }
        return "<table><thead>" + innerTHead + "</thead><tbody>" + innerTBody + "</tbody></table>";
    }
    else
        return "leeres Ergebnis";
}
function query3() {
    var q = new QDBQuery(testdb);
    q.onFinish(function(){
        var result = document.getElementById("result");
        result.innerHTML = renderAsTable(q.result, 100);
    });
    q.join({
        tables: [
            {name: "Rechnung", as: "r", where: {ID: {"<": 50}}},
            {name: "Artikel", as: "a"},
            {name: "ArtikelZuRechnung", as: "azr"},
            {name: "Benutzer", as: "b"}
        ],
        joins: [
            {table1: "azr", table1attr: "ArtikelID", table2: "a", table2attr: "ID"},
            {table1: "r", table1attr: "ID", table2: "azr", table2attr: "RechnungID", stack: true},
            {table1: "r", table1attr: "BenutzerID", table2: "b", table2attr: "ID"}
        ],
        keys: [
            {tablename: "r", attr: "BenutzerID"},
            {tablename: "b", attr: "Vorname"},
            {tablename: "b", attr: "Nachname"},
            {tablename: "r", attr: "Datum"},
            {tablename: "r", attr: "ID"},
            {as: "Summe", func: "sum", value: {
                    operator: "*",
                    values: [
                        {tablename: "azr", attr: "Anzahl"},
                        {tablename: "a", attr:"Preis"}
                    ]
                }
            }
        ]
    });
}
function query4() {
    var q = new QDBQuery(testdb);
    q.onFinish(function(){
        var result = document.getElementById("result");
        result.innerHTML = renderAsTable(q.result, 100);
    });
    q.get("Rechnung", {ID: {"<": 5}});
}
function query5() {
    var q = new QDBQuery(testdb);
    q.onFinish(function(){
        var result = document.getElementById("result");
        result.innerHTML = renderAsTable(q.result, 100);
    });
    q.join({
        tables: [
            {name: "Rechnung", as: "r", where: {ID: {"<": 5}}},
            {name: "Benutzer", as: "b"}
        ],
        joins: [
            {table1: "r", table1attr: "BenutzerID", table2: "b", table2attr: "ID"}
        ],
        keys: [
            {tablename: "r", attr: "BenutzerID"},
            {tablename: "b", attr: "Vorname"},
            {tablename: "b", attr: "Nachname"},
            {tablename: "r", attr: "Datum"}
        ]
    });
}
function query6() {
    var q = new QDBQuery(testdb);
    q.onFinish(function(){
        var result = document.getElementById("result");
        result.innerHTML = renderAsTable(q.result, 100);
    });
    q.join({
        tables: [
            {name: "Rechnung", as: "r", where: {ID: 2}},
            {name: "Artikel", as: "a"},
            {name: "ArtikelZuRechnung", as: "azr"}
        ],
        joins: [
            {table1: "azr", table1attr: "RechnungID", table2: "r", table2attr: "ID"},
            {table1: "azr", table1attr: "ArtikelID", table2: "a", table2attr: "ID"}
        ],
        keys: [
            {tablename: "r", attr: "BenutzerID"},
            {tablename: "r", attr: "Datum"},
            {tablename: "a", attr: "Bezeichnung"},
            {tablename: "azr", attr: "Anzahl"},
            {tablename: "azr", attr: "ID", as: "azrID"},
            {tablename: "a", attr: "Preis", as: "Einzelpreis"},
            {as: "Preis", value: {
                    operator: "*",
                    values: [
                        {tablename: "azr", attr: "Anzahl"},
                        {tablename: "a", attr:"Preis"}
                    ]
                }
            }
        ]
    });
}
function query7() {
    var q = new QDBQuery(testdb);
    q.onFinish(function(){
        var result = document.getElementById("result");
        result.innerHTML = renderAsTable(q.result, 100);
    });
    q.join({
        tables: [
            {name: "Rechnung", as: "r", where: {ID: {"<": 20}}},
            {name: "ArtikelZuRechnung", as: "azr"},
            {name: "Benutzer", as: "b"}
        ],
        joins: [
            {table1: "r", table1attr: "ID", table2: "azr", table2attr: "RechnungID", stack: true},
            {table1: "r", table1attr: "BenutzerID", table2: "b", table2attr: "ID"}
        ],
        keys: [
            {tablename: "r", attr: "BenutzerID"},
            {tablename: "b", attr: "Vorname"},
            {tablename: "b", attr: "Nachname"},
            {tablename: "r", attr: "Datum"},
            {tablename: "r", attr: "ID"},
            {as: "AnzahlArtikel", func: "sum", tablename: "azr", attr: "Anzahl"}
        ]
    });
}
init();