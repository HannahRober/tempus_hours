# Eina pel tempus UPC

Aquest repositori conté una eina per ajudar a obtenir les hores treballades pels empleats i descarregar-ho en un csv.

## Instal·lació

Per utilitzar-la, crea manualment un nou element a la barra d'adreces d'interès del teu navegador i afegeix el següent codi al camp URL (pots posar el que tu vulguis com a nom):

```javascript
javascript:(function(){if(window.__TEMPUS_HOURS_LOADED__){alert("Tempus script already loaded");return;}window.__TEMPUS_HOURS_LOADED__=true;var s=document.createElement("script");s.src="https://raw.githubusercontent.com/HannahRober/tempus_hours/main/clean_tempus.js";s.onload=function(){console.log("Tempus Hours script loaded");};s.onerror=function(){alert("Failed to load Tempus Hours script");};document.head.appendChild(s);})();
```
