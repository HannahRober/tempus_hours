# Eina pel tempus UPC

Aquest repositori conté una eina per ajudar a obtenir les hores treballades pels empleats i descarregar-ho en un csv.

## Instal·lació

Per utilitzar-la, crea manualment un nou element a la barra d'adreces d'interès del teu navegador i afegeix el següent codi al camp URL (pots posar el que tu vulguis com a nom):

```javascript
javascript:(function(){var script = document.createElement('script');script.src = "https://raw.githubusercontent.com/HannahRober/tempus_hours/main/clean_tempus.js";script.onload = function() {console.log("Tempus Month Manager loaded");};script.onerror = function() {alert("Failed to load Tempus script");};document.head.appendChild(script);})();
```
