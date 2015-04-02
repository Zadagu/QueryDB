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

/**
 * @param {IDBDatabase} indexeddb
 * @class {Object} QDBQuery
 */
var QDBQuery = (function(){
    /** @constructs */
    var qdbquery = function (indexeddb) {
        /** @type IDBDatabase */
        var idb = indexeddb;
        /**
         * Das Ergebnis von QDBQuery.get(), oder QDBQuery.query()
         * @type {Array.<Object>}
         */
        this.result = new Array();
        /** @type {Array.<function>} */
        this.finishedListeners = new Array();
        /**
         * eine Funktion hinzufügen, die nach Abschluss ausgeführt werden soll
         * @public
         * @method
         * @param f {function} - callback, wird aufgerufen sobald die Operation ausgeführt ist.
         */
        this.onFinish = function(f){
            this.finishedListeners.push(f);
        };
        /**
         * Beschreibt die Bedingungen, die ein Datensatz erfüllen soll.
         * @typedef {Object.<string, (QDBQuery.WhereCondition|QDBQuery.WhereValue)>} QDBQuery.Where
         * @example <caption>Nach einem bestimmten Datensatz suchen:</caption>
         * {ID: 5}
         * @example <caption>Vergleichsoperatoren nutzen:</caption>
         * {Preis: {"<": 20000}}
         * @example <caption>mehrere Attribute untersuchen:</caption>
         * {foo: {"<": 423}, bar: 43}
         */
        /**
         * @typedef {Object.<string, WhereValue>} QDBQuery.WhereCondition
         *
         */
        /**
         * @typedef {(Number|String|Array)} QDBQuery.WhereValue
         *
         */
        /**
         * Datensätze aus einem Object-Store laden.
         * @param {string} from - Name des Object-Stores
         * @param {QDBQuery.Where} where - Bedingung für die zu löschende Datensätze
         * @param {string|{indexby: string, stack: boolean}} [indexby=""] Wenn stack true ist, dann werden unter dem index Listen erstellt.
         * @example
         * var q = new QDBQuery(idb);
         * q.onFinish(function(){
         *     // Do something here
         * });
         * q.get("Artikel", {Preis: {"<": 20000}}, "ID");
         */
        this.get = function (from, where, indexby) {
            this.result = [];
            /** @type {QDBQuery} */
            var _this = this;
            var handler = idb.transaction(from, 'readonly').objectStore(from).openCursor();
            handler.onsuccess = function(e) {
                /** @type {IDBCursor} */
                var cursor = e.target.result;
                if(cursor) {
                    if(_this._wanted(cursor.value, where)) {
                        if(indexby == "" || indexby == null) {
                            _this.result[_this.result.length] = cursor.value;
                        } else if(typeof indexby === "string") {
                            _this.result[cursor.value[indexby]] = cursor.value;
                        } else if(typeof indexby === "object") {
                            if(indexby.stack == true)
                                if(_this.result[cursor.value[indexby.indexby]] == null)
                                    _this.result[cursor.value[indexby.indexby]] = [cursor.value];
                                else
                                    _this.result[cursor.value[indexby.indexby]].push(cursor.value);
                            else
                                _this.result[cursor.value[indexby.indexby]] = cursor.value;
                        }
                    }
                    cursor.continue();
                }
                else
                    finished();
            };
            handler.onerror = function(e) { finished(); };
            function finished(){
                for(var i in _this.finishedListeners)
                    setTimeout(function(){_this.finishedListeners[i](_this.result)}, 5);
            }
        };
        /**
         * @typedef {Object} QDBQuery.QueryTable
         * @property {String} name
         * @property {?String} as
         * @property {?Object} where
         */
        /**
         * @typedef {Object} QDBQuery.QueryJoin
         * @property {String} table1
         * @property {String} table1attr
         * @property {?boolean} stack
         * @property {String} table2
         * @property {String} table2attr
         */
        /**
         * @typedef {Object} QDBQuery.Query
         * @property {Array.<QDBQuery.QueryTable>} tables
         * @property {Array.<QDBQuery.QueryJoin>} joins
         * @property {?Array.<QDBQuery.QueryAttr>} keys  - Attribute die im Ergebnis angezeigt werden sollen. Wenn kein Wert gesetzt ist, so werden alle Attribute ausgegeben.
         * @example <caption>Easy Joining</caption>
         *  {
         *      tables: [{name: "Rechnung"}, {name: "Artikel"}, {name: "ArtikelZuRechnung"}],
         *      joins: [
         *          {table1: "Rechnung", table1attr: "ID", table2: "ArtikelZuRechnung", table2attr: "RechnungID"},
         *          {table1: "ArtikelZuRechnung", table1attr: "ArtikelID", table2: "Artikel", table2attr: "ID"}
         *      ],
         *      keys: [
         *          {tablename: "Rechnung", attr: "ID"},
         *          {tablename: "Artikel", attr: "Bezeichung"},
         *          {tablename: "ArtikelZuRechnung", attr: "Anzahl"},
         *          {tablename: "Artikel", attr: "Preis"},
         *      ]
         *  }
         * @example <caption>Using aggregate functions</caption>
         *  {
         *      tables: [{name: "Rechnung"}, {name: "Artikel"}],
         *      joins: [
         *          {table1: "Rechnung", table1attr: "ID", table2: "ArtikelZuRechnung", table2attr: "RechnungID", stack: true}
         *      ],
         *      keys: [
         *          {tablename: "Rechnung", attr: "ID"},
         *          {tablename: "ArtikelZuRechnung", attr: "Anzahl", as: "AnzahlArtikel", func: "sum"}
         *      ]
         *  }
         */
        /**
         * @typedef {Object} QDBQuery.QueryAttr
         * @property {?String} tablename
         * @property {?String} attr
         * @property {?String} as
         * @property {?String} func
         * @property {?Array.<QDBQuery.QueryValue>} value
         */
        /**
         * @typedef {Object} QDBQuery.QueryValue
         * @property {String} operator - "*", "/", "+", "-"
         * @property {Array.<(QDBQuery.QueryAttr|QDBQuery.QueryValue)>} values
         */
        /**
         * Datensätze aus mehreren Objectstores verknüpft laden.
         * @param {QDBQuery.Query} query
         * @param {String} [indexby=""] Dieser Wert sollte für jeden Datensatz einmalig sein.
         * @example <caption>Execute a simple join</caption>
         * var q = new QDBQuery(testdb);
         * q.onFinish(function(){
         *     // Do something
         *     console.log(q.result);
         * });
         * q.join({
         *     tables: [
         *         {name: "Rechnung", as: "r", where: {ID: {"<": 5}}},
         *         {name: "Benutzer", as: "b"}
         *     ],
         *     joins: [
         *         {table1: "r", table1attr: "BenutzerID", table2: "b", table2attr: "ID"}
         *     ],
         *     keys: [
         *         {tablename: "r", attr: "BenutzerID"},
         *         {tablename: "b", attr: "Vorname"},
         *         {tablename: "b", attr: "Nachname"},
         *         {tablename: "r", attr: "Datum"}
         *     ]
         * });
         */
        this.join = function(query, indexby) {
            this.result = [];
            /** @type {QDBQuery} */
            var _this = this;
            var tmp = {};
            /** @type{JoinHierarchieItem} */
            var hierarchie = erstelleJoinTree();
            console.log(JSON.stringify(hierarchie));
            ladeTabellen(function(){
                _this.result = buildResult(hierarchie);
                finished();
            });
            /**
             * @typedef {Object} JoinHierarchieItem
             * @property {String} table
             * @property {String} key
             * @property {QDBQuery.QueryJoin} join
             * @property {?Array.<JoinHierarchieItem>} children
             */
            /**
             * erstellt eine Liste, in welcher Reihenfolge die Tabellen angefügt werden sollen
             * @returns {JoinHierarchieItem}
             * @method
             */
            function erstelleJoinTree() {
                // TODO: sicherstellen, dass jede Tabelle nur ein mal als table2 angegeben wird.
                if (query.joins != null) {
                    /** @type {JoinHierarchieItem} */
                    var result = {table: query.joins[0].table1, join: null, key: null, children: []};
                    for (var i = 0; i < query.joins.length; i++) {
                        var pos1 = indexOfTree(result, query.joins[i].table1);
                        var pos2 = indexOfTree(result, query.joins[i].table2);
                        if (pos1[pos1.length - 1] == -1) {
                            if (pos2[pos2.length - 1] == -1) {
                                result.children.push({table: query.joins[i].table1, key: null, join: query.joins[i], children: [{table: query.joins[i].table2, join: query.joins[i], key: query.joins[i].table2attr, children: []}]});
                                pos1 = [0, result.children.length - 1];
                            } else {
                                if(pos2[0] == 0) {
                                    result.key = query.joins[i].table2attr;
                                    result.join = query.joins[i];
                                    result = {table: query.joins[i].table1, key: null, join: query.joins[i], children: [result]};
                                } else {
                                    var childpos = pos2.splice(pos2.length - 1, 1);
                                    /** @type {JoinHierarchieItem} */
                                    var parrent = getItemFromTree(result, pos2);
                                    /** @type {JoinHierarchieItem} */
                                    var item2 = parrent.children.splice(childpos, 1);
                                    item2.key = query.joins[i].table2attr;
                                    result.children.push({table: query.joins[i].table1, join: query.joins[i], children: [item2]});
                                }
                            }
                        } else {
                            var item1 = getItemFromTree(result, pos1);
                            if (pos2[pos2.length - 1] == -1) {
                                item1.children.push({table: query.joins[i].table2, join: query.joins[i], key: query.joins[i].table2attr, children: []});
                            } else {
                                var childpos = pos2.splice(pos2.length - 1, 1);
                                /** @type {JoinHierarchieItem} */
                                var parrent = getItemFromTree(result, pos2);
                                /** @type {JoinHierarchieItem} */
                                var item2 = parrent.children.splice(childpos, 1);
                                item2.key = query.joins[i].table2attr;
                                item1.children.push(item2);
                            }
                        }
                    }
                } else {
                    return null;
                }
                return result;
            }
            /**
             * Gibt die Position der Tabelle im Result zurück.
             * @param {JoinHierarchieItem} tree
             * @param {String} name - Name of table
             * @returns {Array.<Number>}
             */
            function indexOfTree(tree, name) {
                if(tree.table == name)
                    return [0];
                if(tree.children == null)
                    return [-1];
                for(var i = 0; i < tree.children.length; i++) {
                    var index = indexOfTree(tree.children[i], name);
                    if(index[index.length - 1] != -1) {
                        index.splice(0, 0, i);
                        return index;
                    }
                }
                return [-1];
            }
            /**
             * gibt aus der gewünschten Stelle das entsprechende Element zurück
             * @param {JoinHierarchieItem} tree
             * @param {Array.<Number>} path
             * @returns {JoinHierarchieItem}
             */
            function getItemFromTree(tree, path) {
                if(path.length > 1) {
                    var child = tree.children[path[0]];
                    path.splice(0, 1);
                    return getItemFromTree(child, path);
                } else {
                    return tree;
                }
            }
            /**
             * Lädt alle gewünschten Tabellen
             * @param {Function} callback
             */
            function ladeTabellen(callback) {
                var fertig = {};
                for(var indextable in query.tables) {
                    loadTable(indextable);
                }
                function loadTable(indextable) {
                    var as = typeof query.tables[indextable].as === "undefined" ? query.tables[indextable].name : query.tables[indextable].as;
                    fertig[as] = false;
                    var c = new QDBQuery(idb);
                    c.onFinish(function(result) {
                        tmp[as] = result;
                        fertig[as] = true;
                        if(allefertig())
                            callback();
                    });
                    var index = indexOfTree(hierarchie, as);
                    var item = getItemFromTree(hierarchie, index);
                    var stack = (item.join != null) ? item.join.stack : false;
                    var indexby = (item.key == null) ? null : {indexby: item.key, stack: stack};
                    c.get(query.tables[indextable].name, query.tables[indextable].where, indexby);
                }
                function allefertig() {
                    for(var i in fertig)
                        if(fertig[i] == false)
                            return false;
                    return true;
                }
            }
            /**
             * setzt das Ergebnis zusammen
             * @function
             * @param {JoinHierarchieItem} tree
             */
            function buildResult(tree, htabelle) {
                var haupttabelle = (typeof htabelle === "undefined") ? tmp[tree.table] : htabelle;
                var result = [];
                for (var i in haupttabelle) {
                    var data = {};
                    data[tree.table] = haupttabelle[i];
                    data["__keys"] = []; // Array um bereits fertige Keys zu speichern
                    // Daten Sammeln:
                    try {
                        data = sammleDaten(data, tree);
                        var fertigerdatensatz = createDataSet(data, query.keys);
                        for (var i = 0; i < data["__keys"].length; i++)
                            for (var attr in data["__keys"][i])
                                fertigerdatensatz[attr] = data["__keys"][i][attr];
                        result.push(fertigerdatensatz);
                    }
                    catch (err) {
                        if(!(err instanceof QDBQuery.NoMatchingEntriesException || err instanceof QDBQuery.TableNotFound))
                            throw err
                    }
                }
                return result;
                /**
                 *
                 * @param {Object} datensatz
                 * @param {JoinHierarchieItem} root
                 */
                function sammleDaten(datensatz, root) {
                    for (var i = 0; i < root.children.length; i++) {
                        if (root.children[i].join.stack && root.children[i].children.length > 0) {
                            var htabelle = getTableData(datensatz, root.children[i].join);
                            var d = buildResult(root.children[i], htabelle);
                            var ergebnis = verarbeiteStack(d, query.keys);
                            datensatz["__keys"].push(ergebnis);
                        } else {
                            datensatz = joinTables(datensatz, root.children[i]);
                        }
                    }
                    return datensatz;
                }
                /**
                 *
                 * @param {*} datenmenge
                 * @param {Array.<QDBQuery.QueryAttr>} keys
                 * @returns {*}
                 */
                function verarbeiteStack(datenmenge, keys) {
                    var neuekeys = [];
                    if(datenmenge.length == 0)
                        return null;
                    for(var attr in datenmenge[0]) {
                        var k = getAttrByAlias(attr, keys);
                        neuekeys.push({tablename: 'stack', attr: k.as, func: k.func});
                    }
                    return createDataSet({'stack': datenmenge}, neuekeys);
                }
                /**
                 *
                 * @param {Object} datensatz
                 * @param {JoinHierarchieItem} innertree
                 * @returns {*}
                 */
                function joinTables(datensatz, innertree) {
                    var t = getTableData(datensatz, innertree.join);
                    if (t == null)
                        throw new QDBQuery.NoMatchingEntriesException();
                    datensatz[innertree.table] = t;
                    for (var i = 0; i < innertree.children.length; i++) {
                        if (innertree.children[i].join.stack && innertree.children[i].children.length > 0) {
                            var htabelle = getTableData(datensatz, innertree.join);
                            var d = buildResult(innertree.children[i], htabelle);
                            var ergebnis = verarbeiteStack(d, query.keys);
                            datensatz["__keys"].push(ergebnis);
                        } else {
                            datensatz = joinTables(datensatz, innertree.children[i]);
                        }
                    }
                    return datensatz;
                }
                /** gibt für die Tabelle die passenden Daten zum verbinden zurück
                 * @param {Object} datensatz        - bereits gesammelte Daten
                 * @param {QDBQuery.QueryJoin} join          - Informationen über die Tabelle, die verbunden werden soll
                 * @return {Object} passende Daten
                 */
                function getTableData(datensatz, join) {
                    return tmp[join.table2][datensatz[join.table1][join.table1attr]]
                }
                function createDataSet(datensatz, keys) {
                    // Tabellennamen sammeln:
                    var tables = [];
                    for (var tablename in datensatz)
                        if (tablename != "__keys")
                            tables.push(tablename);

                    var result = {};
                    if (keys instanceof Array) {
                        // Schlüssel der Reihe nach abarbeiten
                        for (var i = 0; i < keys.length; i++) {
                            if (tables.indexOf(keys[i].tablename) != -1 && isAttr(keys[i]))
                                result = addKey(result, datensatz, keys[i]);
                            else if (typeof keys[i].value === "object") {
                                if(isOperation(keys[i].value))
                                    try {
                                        result[keys[i].as] = solveOperation(keys[i].value, datensatz);
                                    } catch (err) {
                                        if (err instanceof QDBQuery.TableNotFound) {
                                            var pos = indexOfAttrIn__keys(keys[i].as, datensatz["__keys"]);
                                            if (pos != -1) {
                                                result[keys[i].as] = datensatz["__keys"][pos][keys[i].as];
                                            } else
                                                throw err;
                                        }
                                    }
                                else
                                    throw "Ungültiger Wert für Value";
                            }
                        }
                    }
                    return result;
                    /**
                     * fügt an den Datensatz das Attribut mit Wert an
                     * @param datensatz
                     * @param datenmenge
                     * @param {QDBQuery.QueryAttr} key
                     */
                    function addKey(datensatz, datenmenge, key) {
                        var value;
                        if(key.func == "sum")
                            value = sum(datenmenge[key.tablename], key.attr);
                        else if(key.func == "avg")
                            value = avg(datenmenge[key.tablename], key.attr);
                        else if(key.func == "max")
                            value = max(datenmenge[key.tablename], key.attr);
                        else if(key.func == "min")
                            value = min(datenmenge[key.tablename], key.attr);
                        else if(key.func == "count")
                            value = count(datenmenge[key.tablename], key.attr);
                        else if(key.func == "median")
                            value = count(datenmenge[key.tablename], key.attr);
                        else
                            value = datenmenge[key.tablename][key.attr];
                        var as = (key.as != null) ? key.as : key.attr;
                        datensatz[as] = value;
                        return datensatz;
                    }
                    /**
                     *
                     * @param {QDBQuery.QueryValue} operation
                     * @param {object} datenmenge
                     */
                    function solveOperation(operation, datenmenge) {
                        var result, func;
                        if(operation.operator == "*")
                            func = function(a, b){return a * b};
                        if(operation.operator == "/")
                            func = function(a, b){return a / b};
                        if(operation.operator == "+")
                            func = function(a, b){return a + b};
                        if(operation.operator == "-")
                            func = function(a, b){return a - b};
                        if(operation.values.length < 2)
                            throw "Zu wenige Operanden";
                        if(operation.values.length > 1) {
                            var a, b, tabelle;
                            if(isOperation(operation.values[0]))
                                a = solveOperation(operation.values[0], datenmenge);
                            else {
                                tabelle = datenmenge[operation.values[0].tablename];
                                if(tabelle == null)
                                    throw new QDBQuery.TableNotFound()
                                a = tabelle[operation.values[0].attr];
                            }

                            if(isOperation(operation.values[0]))
                                b = solveOperation(operation.values[1], datenmenge);
                            else
                                b = datenmenge[operation.values[1].tablename][operation.values[1].attr];
                            result = func(a, b);
                        }

                        if (operation.values.length > 2) {
                            for (var i = 2; i < operation.values.length; i++) {
                                if (isOperation(operation.values[i]))
                                    result = func(result, solveOperation(operation.values[i], datenmenge));
                                else
                                    result = func(result, datenmenge[operation.values[i].tablename][operation.values[i].attr]);
                            }
                        }
                        return result;
                    }
                    /**
                     *
                     * @param {String} lookfor
                     * @param {Array.<Object>} dataset_keys
                     * @returns {number}
                     */
                    function indexOfAttrIn__keys(lookfor, dataset_keys) {
                        for (var i = 0; i < dataset_keys.length; i++) {
                            for (var attr in dataset_keys[i])
                                if(lookfor == attr)
                                    return i;
                        }
                        return -1;
                    }
                }
                /**
                 * gibt ein QDBQuery.QueryAttr mit dem gewählten Alias aus einer Liste zurück.
                 * @param {String} alias
                 * @param {Array.<QDBQuery.QueryAttr>} keys
                 * @returns {(QDBQuery.QueryAttr|Number)}
                 */
                function getAttrByAlias(alias, keys) {
                    for (var i = 0; i < keys.length; i++) {
                        if (keys[i].as == null){
                            if (alias == keys[i].attr)
                                return keys[i];
                        } else {
                            if (alias == keys[i].as)
                                return keys[i];
                        }
                    }
                    return -1;
                }
                /**
                 *
                 * @param {string} tableAlias
                 * @returns {QDBQuery.QueryTable}
                 */
                function getTableInfo(tableAlias) {
                    for(var i = 0; i < query.tables.length; i++) {
                        if(query.tables[i].as == tableAlias)
                            return query.tables[i];
                    }
                }
                /**
                 *
                 * @param {*} obj
                 * @returns {boolean}
                 */
                function isOperation(obj) {
                    return (obj.hasOwnProperty("operator") && obj.hasOwnProperty("values"));
                }
                function isAttr(obj) {
                    return (obj.hasOwnProperty("tablename") && obj.hasOwnProperty("attr"));
                }
            }
            function finished() {
                for(var i in _this.finishedListeners)
                    setTimeout(function(){_this.finishedListeners[i](_this.result)}, 5);
            }
            /**
             * Durchschnitt berechnen
             * @param {Array.<Object>} tabelle
             * @param {String} key
             * @returns {number}
             */
            function avg(tabelle, key) {
                var sum = 0;
                var count = 0;
                for(var i in tabelle) {
                    sum += tabelle[i][key];
                    count++;
                }
                return sum/count;
            }
            /**
             * Maximum berechnen
             * @param {Array.<Object>} tabelle
             * @param {String} key
             * @returns {number}
             */
            function max(tabelle, key) {
                var highest = null;
                for(var i in tabelle) {
                    if(highest == null)
                        highest = tabelle[i][key];
                    else
                    if(tabelle[i][key] > highest)
                        highest = tabelle[i][key];
                }
                return highest;
            }
            /**
             * Minimum berechnen
             * @param {Array.<Object>} tabelle
             * @param {String} key
             * @returns {number}
             */
            function min(tabelle, key) {
                var smallest = null;
                for(var i in tabelle) {
                    if(smallest == null)
                        smallest = tabelle[i][key];
                    else
                    if(tabelle[i][key] < smallest)
                        smallest = tabelle[i][key];
                }
                return smallest;
            }
            /**
             * Summe berechnen
             * @param {Array.<Object>} tabelle
             * @param {String} key
             * @returns {number}
             */
            function sum(tabelle, key) {
                var sum = 0;
                for(var i in tabelle) {
                    sum += tabelle[i][key];
                }
                return sum;
            }
            /**
             * Datensätze zählen
             * @param {Array.<Object>} tabelle
             * @param {String} key
             * @returns {number}
             */
            function count(tabelle, key) {
                if(tabelle instanceof Array)
                    return tabelle.length;
                else
                    return 0;
            }
            /**
             * Median berechnen
             * @param {Array.<Object>} tabelle
             * @param {String} key
             * @returns {number}
             */
            function median(tabelle, key) {
                var count = 0;
                var num = [];
                for(var i in tabelle) {
                    if(num[tabelle[i][key]] == null)
                        num[tabelle[i][key]] = 1;
                    else
                        num[tabelle[i][key]] += 1;
                    count++;
                }
                var max = count / 2;
                var counter = 0;
                var index;
                var indexbefore = null;
                for(index in num) {
                    counter += num[index];
                    if(counter > max)
                        break;
                    indexbefore = index;
                }
                if(max - counter < -1)
                    return parseInt(index);
                else
                if(Math.floor(max) == max) { // überprüfen, ob die Anzahl ungerade ist
                    if (count == 1)
                        return parseInt(index);
                    else
                        return (parseInt(index) + parseInt(indexbefore)) / 2;
                }
                else
                    return parseInt(index);
            }
        };
        /**
         * Datensätze in einem Object Store löschen.
         * @param {string} from
         * @param {object} where
         * @param {QDBCounter} [counter]
         */
        this.remove = function(from, where, counter) {
            this.result = [];
            var c = new QDBCounter(counter);
            /** @type {QDBQuery} */
            var _this = this;
            c.add();
            var handler = idb.transaction(from, 'readwrite').objectStore(from).openCursor();
            handler.onsuccess = function(e){
                var cursor = e.target.result;
                if(cursor) {
                    if(_this._wanted(cursor.value, where)) {
                        cursor.delete(cursor.value);
                    }
                    cursor.continue();
                }
                else {
                    for(var i in _this.finishedListeners)
                        setTimeout(function(){_this.finishedListeners[i](_this.result)}, 5);
                    c.finishedOperation();
                }
            }
        };
        this._vergleichen = function (wherebefehl, value) {
            if(wherebefehl instanceof Array && !(value instanceof Array)) {
                return wherebefehl.indexOf(value) > -1;
            } else if(wherebefehl instanceof Array && value instanceof Array && wherebefehl[0] instanceof Array) {
                return wherebefehl.indexOf(value) > -1;
            } else if(typeof wherebefehl === 'object') {
                var checks = [];
                if(wherebefehl.is != null)
                    if(!(value == wherebefehl.is))
                        return false;
                if(wherebefehl["=="] != null)
                    if(!(value == wherebefehl["=="]))
                        return false;
                if(wherebefehl["==="] != null)
                    if(!(value === wherebefehl["==="]))
                        return false;
                if(wherebefehl.lt != null)
                    if(!(value < wherebefehl.lt))
                        return false;
                if(wherebefehl["<"] != null)
                    if(!(value < wherebefehl["<"]))
                        return false;
                if(wherebefehl.lte != null)
                    if(!(value <= wherebefehl.lte))
                        return false;
                if(wherebefehl["<="] != null)
                    if(!(value <= wherebefehl["<="]))
                        return false;
                if(wherebefehl.gt != null)
                    if(!(value > wherebefehl.gt))
                        return false;
                if(wherebefehl[">"] != null)
                    if(!(value > wherebefehl[">"]))
                        return false;
                if(wherebefehl.gte != null)
                    if(!(value >= wherebefehl.gte))
                        return false;
                if(wherebefehl["=>"] != null)
                    if(!(value >= wherebefehl["=>"]))
                        return false;
                return true;
            } else  // index entspricht einem Attribut im Store
                return value == wherebefehl;
        };
        this._wanted = function (value, where) {
            if(typeof where === 'object'){
                for(var index in where) {
                    if (!this._vergleichen(where[index], value[index]))
                        return false
                }
                return true;
            } else if (typeof where === "undefined")
                return true;
        };
        /**
         *
         * @param {string} store
         * @param {Array.<object>|object} record
         * @param {Array.<string>|string} [unique] Dieser Parameter kann dazu genutzt werden, den primary Key zu umgehen. Es ermöglicht mehrere Attribute zu einem einzigartigen Schlüssel zusammenzufassen
         */
        this.save = function (record, store, unique) {
            this.result = [];
            var _this = this;
            var objstore = idb.transaction(store, 'readwrite').objectStore(store);
            var handler = objstore.openCursor();
            unique = (typeof unique === "undefined") ? [objstore.primaryKey] : unique;
            unique = (typeof unique === "string") ? [unique] : unique;
            handler.onsuccess = function(e){
                /** @type {IDBCursor} */
                var cursor = e.target.result;
                if(cursor) {
                    var allgood = true;
                    for (var i in unique){
                        if(cursor.value[unique[i]] != record[unique[i]]) {
                            allgood = false;
                            break;
                        }
                    }
                    if(allgood) {
                        for(var attr in record)
                            cursor.value[attr] = record[attr];
                        var wert = cursor.value;
                        /** @type {IDBRequest} */
                        var updatehandler = cursor.update(cursor.value);
                        updatehandler.onsuccess = function() {
                            finished();
                        };
                        updatehandler.onerror = function() { failed(); };
                    }
                    else
                        cursor.continue();
                }
                else {
                    if(record[objstore.primaryKey] != null)
                        record[objstore.primaryKey] = null;
                    var addhandler = objstore.add(record);
                    addhandler.onsuccess = function(e) {
                        finished();
                    };
                    addhandler.onerror = function() { failed(); };
                }
            };
            function finished() {
                for(var i in _this.finishedListeners)
                    setTimeout(function(){_this.finishedListeners[i](_this.result)}, 5);
            }
            function failed() {
                console.log("Can't save Object " + JSON.stringify(record) + " into " + store);
            }
        };
    };
    /**
     * Fehler der erzeugt wird, wenn in der zu verbindenden Tabelle kein passender Datensatz vorhanden ist.
     * Wird erzeugt durch joinTables()
     * @constructor {Object} QDBQuery.NoMatchingEntriesException
     * @memberof QDBQuery
     */
    qdbquery.NoMatchingEntriesException = function() {
        this.message = "There are no matching entries.";
    };
    /**
     * Wird erzeugt von solveOperation().
     * @constructor {Object} QDBQuery.TableNotFound
     * @memberof QDBQuery
     */
    qdbquery.TableNotFound = function() {
        this.message = "Table not found in given data.";
    };
    return qdbquery;
})();
/**
 * @param {IDBDatabase} indexeddb
 * @constructor
 */
function QDBInsert(indexeddb) {
    /** @type IDBDatabase */
    var idb = indexeddb;
    /**
     * Ein assoziatives Array in der Datenbank speichern
     * @param assoc
     * @param [counter] {QDBCounter}
     */
    this.insert = function (assoc, counter) {
        var c = new QDBCounter(counter);
        c.add();
        for(var store in assoc) {
            for(var datensatzindex in assoc[store]) {
                insertdatensatz(store, assoc[store][datensatzindex]);
            }
        }
        c.finishedOperation();
        /**
         * Fügt ein Objekt in den gewählten Object-Store ein.
         * @param {String} store
         * @param {Object} obj
         */
        function insertdatensatz(store, obj) {
            var transaction = idb.transaction(store, 'readwrite').objectStore(store).add(obj);
            var _this = this;
            c.add();
            transaction.onsuccess = function (event) {
                c.finishedOperation();
            };
            transaction.onerror = function (event) {
                console.log(store + ": " + obj[idb.transaction(store).objectStore(store).keyPath] + " konnte nicht gespeichert werden.");
                c.failedOperation();
            };
        }
    };
    /**
     * eine Funktion hinzufügen, die nach Abschluss ausgeführt werden soll
     * @public
     * @method
     * @param f {function}
     */
    this.onFinish = function(f) {
        this.finishedListeners.push(f);
    };
}
/**
 * Dieses Objekt erleichtert es laufende Verbindungen zu zählen.
 * @constructor
 * @param {QDBCounter} [parent=null]
 */
function QDBCounter(parent) {
    /** @type {number} */
    this.totalOperations = 0;
    /** @type {number} */
    this.pendingOperations = 0;
    /** @type {number} */
    this.fails = 0;
    /** @type {Array.<function>} */
    this.tickListeners = [];
    /** @type {Array.<function>} */
    this.finishedListeners = [];
    /**
     * @type {number}
     * @private
     */
    this._start = -1;
    /** @type {number} */
    this._end = -1;
    /**
     * @type {Object.<string, number>}
     * @private
     */
    this._caller = {};
    /**
     * @type {QDBCounter}
     * @private
     */
    this._parent = parent;
    /**
     * gibt den Vortschritt relativ an.
     * @method
     * @public
     * @returns {number}
     */
    this.progressPercent = function() {
        if (this.totalOperations == 0)
            return 0;
        if (this.pendingOperations == 0)
            return 1;
        return (this.totalOperations - this.pendingOperations) / this.totalOperations;
    };
    /**
     * Eine neue Tranksaktion anmelden
     * @method
     * @public
     */
    this.add = function() {
        // Caller auflisten und zählen, um beim Debuggen nicht beendete Transaktionen zu finden
        var caller = arguments.callee.caller.toString();
        if (caller in this._caller)
            this._caller[caller] += 1;
        else
            this._caller[caller] = 1;
        if(this.totalOperations == 0) {
            var _this = this;
            setTimeout(function(){_this._tick(_this);}, 100);
            this._start = Date.now();
        }
        this.totalOperations++;
        this.pendingOperations++;
        if (parent instanceof QDBCounter)
            parent.add();
    };
    /**
     * eine Transkation als fertig melden
     * @public
     * @method
     */
    this.finishedOperation = function() {
        this.pendingOperations--;
        if (parent instanceof QDBCounter)
            parent.finishedOperation();
        // Caller wieder runterzählen
        var caller = arguments.callee.caller.toString();
        if (caller in this._caller)
            this._caller[caller] -= 1;
        else
            this._caller[caller] = -1;
        if(this.pendingOperations == 0) {
            this._end = Date.now();
            for(var i in this.finishedListeners)
                this.finishedListeners[i](this);
        }

    };
    /**
     * eine Transaktion als fehlgeschlagen melden
     * @public
     * @method
     */
    this.failedOperation = function() {
        if (parent instanceof QDBCounter)
            parent.finishedOperation();
        this.pendingOperations--;
        this.fails++;
    };
    /**
     * Tick der alle 100ms ausgeführt wird
     * @param _this {QDBCounter}
     * @method
     * @private
     */
    this._tick = function(_this){ // Hack "this" ist nicht diese Instanz, daher muss die Instanz per Parameter übergeben werden
        if(_this.pendingOperations > 0) {
            for(var i in _this.tickListeners) {
                try {
                    _this.tickListeners[i](_this);
                }
                catch (e) {}
            }
            setTimeout(function(){_this._tick(_this)}, 100);
        }
    };
    /**
     * eine Funktionen hinzufügen, die im Tick ausgeführt werden soll
     * @public
     * @method
     * @param f {function}
     */
    this.onTick = function(f){
        this.tickListeners[this.tickListeners.length] = f;
    };
    /**
     * eine Funktion hinzufügen, die nach Abschluss ausgeführt werden soll
     * @public
     * @method
     * @param f {function}
     */
    this.onFinish = function(f){
        this.finishedListeners[this.finishedListeners.length] = f;
    };
    /**
     * Gibt die Dauer in Sekunden Zurück
     * @method
     * @public
     * @returns {number}
     */
    this.getSeconds = function() {
        if(this._start == -1)
            return 0;
        if(this._end == -1)
            return (Date.now() - this._start) / 1000;
        else
            return (this._end - this._start) / 1000;
    };
}
/**
 * @namespace
 */
var QDBUtilities = {
    /**
     * @typedef {Object} QDBKeyDescriptor
     * @property {String} key
     * @property {IDBOptionalParameters} param
     */
    /**
     * @typedef {Object} IDBOptionalParameters
     * @property {boolean} unique
     * @property {boolean} multiEntry
     */
    /**
     * @typedef {Object} QDBObjectStoreDescriptor
     * @property {String} name
     * @property {String} keyPath
     * @property {boolean} autoIncrement
     * @property {Array.<(QDBKeyDescriptor|String)>} keys - der Key-Path muss hier nicht nochmal genannt werden.
     */
    /**
     * Erstellt einen Object Store
     * @param {IDBDatabase} idb  in update mode
     * @param {QDBObjectStoreDescriptor} storedesc Name oder Objekt
     */
    createStore: function(idb, storedesc) {
        if(!idb.objectStoreNames.contains(storedesc.name)) {
            var store;
            if(typeof storedesc === 'string')
                store = idb.createObjectStore(storedesc);
            else if(typeof storedesc === 'object')
                store = idb.createObjectStore(storedesc.name, {keyPath: storedesc.keyPath, autoIncrement: storedesc.autoIncrement});
            else
                throw "Ungültiger QDBObjectStoreDescriptor";
            for(var i = 0; i < storedesc.keys.length; i++) {
                if(typeof storedesc.keys[i] === 'string')
                    store.createIndex(storedesc.keys[i], storedesc.keys[i]);
                else if(typeof storedesc.keys[i] === 'object')
                    store.createIndex(storedesc.keys[i].key, storedesc.keys[i].key, storedesc.keys[i].param);
            }
            console.log("Store '" + storedesc.name + "' wurde erstellt.");
        }
        else {
            var store = idb.transaction(storedesc.name).objectStore(storedesc.name);
            var neuekeys = [];
            for(var i = 0; i < storedesc.keys.length; i++) {
                if(typeof storedesc.keys[i] === 'string') {
                    if(store.indexNames.indexOf(storedesc.keys[i]) == -1)
                        store.createIndex(storedesc.keys[i], storedesc.keys[i]);
                    neuekeys.push(storedesc.keys[i]);
                } else if(typeof storedesc.keys[i] === 'object') {
                    if(store.indexNames.indexOf(storedesc.keys[i].key) == -1)
                        store.createIndex(storedesc.keys[i].key, storedesc.keys[i].key, storedesc[i].param);
                    neuekeys.push(storedesc.keys[i].key);
                }
            }
            var alte = store.indexNames;
            for(var i = 0; i < alte.length; i++) {
                if(neuekeys.indexOf(alte[i]) == -1) {
                    store.deleteIndex(alte[i]);
                }
            }
            console.log("Store '" + storedesc.name + "' wurde geändert.");
        }
    },
    /**
     * Legt die Datenbankstruktur wie beschrieben an.
     * @param {IDBDatabase} idb - Datenbank im upgrade Zustand
     * @param {Array.<QDBObjectStoreDescriptor>} struktur
     */
    upgradeDatabase: function(idb, struktur) {
        var neuestores = [];
        for(var i in struktur) {
            QDBUtilities.createStore(idb, struktur[i]);
            neuestores.push(struktur[i].name);
        }

    }
};