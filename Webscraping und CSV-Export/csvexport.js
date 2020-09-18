"use strict";

// Packages importieren
const axios = require("axios").default;
const axiosCookieJarSupport = require("axios-cookiejar-support").default;
const cheerio = require("cheerio");
const tough = require("tough-cookie");
const qs = require("qs");
const fs = require("fs");

//Alle konstanten URL-Parameter definieren
const loginURL = "https://loginpage.com/";
const idURL = "https://loginpage.com/index?id=";
const daten = 'https://loginpage.com/daten.php';

// die CSV-Datei anlegen, in welche die ausgelesenen Daten geschrieben werden
const writeDataToCsv = fs.createWriteStream("../data.csv", {
    //der Flag verhindert die Überschreibung der Daten in der Datei
    flags: 'a',
    //Standard-Codierung von fs ist URF-8. Allerdings sollte die zu lesende Seite eine abweichende Kodierung aufweisen,
    //ist dies hier unter "encoding" anzugeben
    encoding: 'latin1'
});

//Die config-Daten importieren
const cfg = require("../config.json");

//Importieren der Liste, deren Daten wir in die CSV-Datei schreiben wollen
//Datentyp - Array
const ids = cfg.ids;



//Cookies definieren, weil die Website eine Authentifizierung erfordert
axiosCookieJarSupport(axios); 
const cookieJar = new tough.CookieJar();

//Login
async function login(){
    await axios.post(
        loginURL,
        qs.stringify({
            username: cfg.username,
            password: cfg.password
        }),
        {
            jar: cookieJar,
            withCredentials: true
        }
    );
}

//Die Webseite mit dem Kunden nach dem Login aufrufen
async function getData(id){
    let idString = id.toString();
    await login();

    await axios.get(
        idURL + idString,
        {
            jar: cookieJar,
            withCredentials: true
        }

    );

    //Das gefetchte Ergebnis speichern. axios arbeitet in UTF-8. Bei Abweichungen der Inhalte muss der Kodierungstyp angegeben werden
    const result = await axios.get(
        daten,
        {
          jar: cookieJar,
          withCredentials: true,
          responseEncoding: 'latin1'
        }
     );
   
     return cheerio.load(result.data);
}


// Auslesen der erforderlichen Daten aus der HTML-Datei über cheerio
const getResults = async function(id) {
    const $ = await getData(id);

    // Daten über die JQuery-Selektoren abfragen
  id = parseInt($('div.sample').text());
  let name = $('#id').val();

  // prüfen ob die ID einen Demoaccount hat
  let accounttyp = "";

  if ($("#demo").val() != null){
    accounttyp = "Demo-Zugang";    
  }else {
    accounttyp = "kein Demo";
  }

  //----------------- Adresse -----------------------
  let strasse = $('#strasse').val();
  let plz = $('#plz').val();
  let ort = $('#ort').val();

  //Demozugänge ausschließen fals nötigs
  if(accounttyp !== "Demo-Zugang"){

    //Schreiben der Kundendaten in die CSV-Datei
    writeDataToCsv.write(`${id},${name},${strasse},${plz},${ort}\r\n`, (err) => {
        console.log(err || "erledigt");
        });
  }

};


//Hier führen wir die Funktionen aus
(async function main() {

    //Die erste Zeile der CSV-Datei schreiben
    writeDataToCsv.write(`ID,Name,Strasse,PLZ,Ort\r\n`, (err) => {
        console.log(err || "Spaltenüberschriften");
        });

    //Array mit den Kunden-ID's sequentiell abarbeiten
    for (let i = 0; i < ids.length; i++){
        const id = ids[i];
        await getResults(id);
    }    

})();