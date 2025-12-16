(async function(){

    function pickDateRange() {
        return new Promise(resolve => {

            // --- overlay ---
            const overlay = document.createElement("div");
            overlay.style.cssText = `
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.35);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 999999;
            `;

            // --- modal ---
            const modal = document.createElement("div");
            modal.style.cssText = `
                background: #fff;
                padding: 16px 18px;
                border-radius: 8px;
                min-width: 260px;
                font-family: Arial, sans-serif;
                box-shadow: 0 8px 20px rgba(0,0,0,.2);
            `;

            modal.innerHTML = `
                <div style="font-size:16px;font-weight:bold;margin-bottom:10px">
                    Select date range
                </div>

                <label style="font-size:13px">
                    Start date<br>
                    <input type="date" id="__startDate" style="width:100%">
                </label>

                <br><br>

                <label style="font-size:13px">
                    End date<br>
                    <input type="date" id="__endDate" style="width:100%">
                </label>

                <br><br>

                <div style="text-align:right">
                    <button id="__cancelBtn">Cancel</button>
                    <button id="__okBtn">OK</button>
                </div>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            const cleanup = () => overlay.remove();

            document.getElementById("__cancelBtn").onclick = () => {
                cleanup();
                resolve(null);
            };

            document.getElementById("__okBtn").onclick = () => {
                const start = document.getElementById("__startDate").value;
                const end   = document.getElementById("__endDate").value;

                if (!start || !end) {
                    alert("Please select both dates.");
                    return;
                }

                cleanup();
                resolve({ start, end }); // YYYY-MM-DD
            };
        });
    }
    
    function toDDMMYYYY(dateStr) {
        const [y, m, d] = dateStr.split("-");
        return `${d}${m}${y}`;
    }

    const range = await pickDateRange();
    const promptStart = toDDMMYYYY(range.start);
    const promptEnd = toDDMMYYYY(range.end);
    console.log(promptStart);
    console.log(promptEnd);

    const COLS_SPEC = "Data,H. teo., H. treb."
    const BASE_URL = "https://tempus.upc.edu/RLG/saldoMensualGestio/detallMes?id={ID}&nom=&primerCognom=&segonCognom=&cerca=0&listOffset=&listOrder=&listSort=&data={MMYYYY}"

    // Parse months range helper
    function ddmmYYYY_to_date(ddmmYYYY) {
        const d = parseInt(ddmmYYYY.slice(0,2), 10);
        const m = parseInt(ddmmYYYY.slice(2,4), 10);
        const y = parseInt(ddmmYYYY.slice(4), 10);
        return new Date(y, m-1, d);
    }

    function formatMMYYYY(d) {
        const m = (d.getMonth()+1).toString().padStart(2,'0');
        const y = d.getFullYear().toString();
        return m + y;
    }
    function monthsBetweenInclusive(startDDMMYYYY, endDDMMYYYY) {
        const s = ddmmYYYY_to_date(startDDMMYYYY);
        const e = ddmmYYYY_to_date(endDDMMYYYY);
        if (s > e) return [];
        const out = [];
        const current = new Date(s.getFullYear(), s.getMonth(), 1);
        while (current <= e) {
        out.push(formatMMYYYY(current));
        current.setMonth(current.getMonth() + 1);
        }
        return out;
    }

    function extractFirstColumnFromDOM(doc, tableId) {
        // 1. Select the table
        const table = doc.getElementById(tableId);
        if (!table) {
            console.error("Table with ID", tableId, "not found");
            return [];
        }

        // 2. Select all rows
        const rows = table.querySelectorAll("tr");

        // 3. Extract first <td> of each row
        const firstColumn = [];
        rows.forEach(row => {
            const firstTd = row.querySelector("td"); // only the first cell
            if (firstTd) {
                firstColumn.push(firstTd.textContent.trim());
            }
        });

        return firstColumn;
    }

    // TODO: sanitize input and prompt errors if wrong
    // ...
    const months = monthsBetweenInclusive(promptStart, promptEnd);
    if (!months.length) { console.error("Invalid range or no months."); return; }
    console.log("Months to fetch:", months);

    const personIDs = extractFirstColumnFromDOM(document, "tableList");
    console.log(personIDs);
   
    // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////// // 

    // Helpers to fetch and parse monthly page and extract table rows 
    async function fetchAndParse(url) {
        const resp = await fetch(url, { credentials: 'same-origin' });
        if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} when fetching ${url}`);
        }
        const text = await resp.text();
        const doc = (new DOMParser()).parseFromString(text, 'text/html');
        return doc;
    }

    function findTable(doc) {
        // known ids from your reference: 'tableList' (per-day) or 'taulaDadesMulti' (per-month)
        let table = doc.getElementById('tableList') || doc.getElementById('taulaDadesMulti') || doc.querySelector('table');
        if (!table) return null;
        return table;
    }

    function headerTexts(table) {
        const ths = table.tHead ? Array.from(table.tHead.rows[0].cells).map(c => c.innerText.trim()) : [];
        if (ths.length) return ths;
        // fallback: try header row in first tbody row (if table has no thead)
        const firstRow = table.tBodies[0] && table.tBodies[0].rows[0];
        if (firstRow) return Array.from(firstRow.cells).map((c,i) => `col${i}`);
        return [];
    }

    function rowCellTexts(row) {
        return Array.from(row.cells).map(c => c.innerText.trim());
    }

    function chooseColumnIndexes(table) {
        const headers = headerTexts(table);
        
        const wantedNames = COLS_SPEC.split(',').map(s => s.trim()).filter(s => s);
        if (headers.length) {
            const idxs = wantedNames.map(name => {
            const i = headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
            return i >= 0 ? i : -1;
            }).filter(i=>i>=0);
            if (idxs.length >= 1) {
                while (idxs.length < 3) idxs.push(idxs[idxs.length-1] || 0);
                return idxs.slice(0,3);
            }
        }

        // fallback: first 3 columns
        return [0,1,2];
    }

    function filterByDateRange(data, startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        return data.filter(item => {
            const date = new Date(item[3][0]); // 3rd value (index 2)
            return date >= start && date <= end;
        });
    }

    // Worker: for each person + month fetch and extract ---
    const results = []; // each entry { personName, personHref, monthMMYYYY, rows: [{col0, col1, col2}], headers: [..] }

    for (const personId of personIDs) {
        try {
            const baseURL = BASE_URL.replace("{ID}", personId);     
            let candidateName = ''

            // iterate months
            for (const mm of months) {
                const monthUrl = baseURL.replace('{MMYYYY}', mm);
                console.log(monthUrl);
                try {
                    const monthDoc = await fetchAndParse(monthUrl);
                    const table = findTable(monthDoc);
                    if (!table) {
                        console.warn("No table found for", monthUrl);
                        continue;
                    }
                    
                    if (!candidateName) {
                        const nameEl = monthDoc.querySelector('.titleControllerLico b');
                        if (nameEl) {
                            candidateName = nameEl.textContent.replace('Saldo de', '').trim();
                        }
                    }

                    const colIdxs = chooseColumnIndexes(table, "") //colSpec);
                    const rows = [];
                    const tbody = table.tBodies[0];
                    if (tbody) {
                        for (const row of Array.from(tbody.rows)) {
                        const cells = rowCellTexts(row);
                        // pick only requested columns, guard index range
                        const out = colIdxs.map(i => (i >= 0 && i < cells.length) ? cells[i] : "");
                        // if row is empty skip
                        const allEmpty = out.every(x => x === "");
                        if (!allEmpty) rows.push(out);
                        }
                    } else {
                        console.warn("No tbody for table at", monthUrl);
                    }

                    results.push({
                        personName: candidateName,
                        personHref: baseURL,
                        month: mm,
                    // headersPicked: colIdxs.map(i => headers[i] || `col${i}`),
                        rows: rows
                    });

                    // small delay to be polite (0.2s)
                    await new Promise(r => setTimeout(r, 200));
                } catch (err) {
                console.warn("Error fetching/parsing month url", monthUrl, err);
                }
            }
            } catch (err) {
            console.error("Error processing person ID", personId, err);
            }
    } // end for personLinks

    console.log("Extraction complete. Results:", results);

    // PREPARE CSV 
    // CSV with columns: personName, personHref, month, colA, colB, colC
    function escapeCsvCell(s) {
        if (s == null) return "";
        s = String(s);
        // If a cell contains a comma, a quote, or a newline, the cell must be wrapped in double quotes.
        // Any double quotes inside the cell must be escaped by doubling them
        if (s.includes('"') || s.includes(',') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
        } else return s;
    }

    // Filter results by dates given in the input
    results = filterByDateRange(results, promptStart, promptEnd);

    let csvLines = [];
    csvLines.push(['personName','personHref','month', 'date', 'TheoricalHours','hoursPerDay'].map(escapeCsvCell).join(','));
    for (const rec of results) {
        for (const r of rec.rows) {
        const line = [
            rec.personName,
            rec.personHref,
            rec.month,
            r[0] || '',
            r[1] || '',
            r[2] || ''
        ].map(escapeCsvCell).join(',');
        csvLines.push(line);
        }
        // if there were no rows, write an empty-line entry
        if (rec.rows.length === 0) {
            csvLines.push([rec.personName, rec.personHref, rec.month, "", "", ""].map(escapeCsvCell).join(','));
        }
    }

    const csvBlob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(csvBlob);
    const filename = `tempus_export_${promptStart}_to_${promptEnd}.csv`;

    // Trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    // Also show results in a new window as JSON pretty
    const jsonWindow = window.open();
    if (jsonWindow) {
        jsonWindow.document.body.innerText = JSON.stringify(results, null, 2);
        jsonWindow.document.title = "Tempus - Extracted JSON";
    }

    console.log("CSV downloaded as", filename, "and JSON opened in a new tab if allowed.");
})();
