document.addEventListener("DOMContentLoaded", () => {
    fetchBatchesForAutocomplete();
});

async function fetchBatchesForAutocomplete() {
    try {
        const response = await fetch('/api/batches');
        const batches = await response.json();
        const datalist = document.getElementById('batchList');
        if (datalist && Array.isArray(batches)) {
            datalist.innerHTML = batches.map(b => `<option value="${b}">`).join('');
        }
    } catch (err) {
        console.error("Could not load batches:", err);
    }
}

// Fixed syntax error and aligned slots to 12 start times (08:00 AM through 05:10 PM)
const standardSlots = [
    "08:00 AM", "08:50 AM", "09:40 AM", "10:30 AM", "11:20 AM",
    "12:10 PM", "01:00 PM", "01:50 PM", "02:40 PM", "03:30 PM", "04:20 PM", "05:10 PM"
];

const daysList = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function cleanTime(tStr) {
    if (!tStr) return "";
    // Remove extra spaces and normalize casing (e.g., "05:10 PM" -> "05:10 PM")
    let str = tStr.trim().toUpperCase().replace(/\s+/g, ' ');
    let parts = str.split(":");
    if (parts[0] && parts[0].length === 1) {
        str = "0" + str;
    }
    return str;
}

async function loadTimetable(selectedElectives = []) {
    const batchInput = document.getElementById("batch");
    const batch = batchInput.value.trim().toUpperCase();
    
    if (!batch) {
        alert("Please enter or select a batch code!");
        return;
    }

    let url = `/timetable/${batch}`;
    if (selectedElectives.length > 0) {
        url += `?electives=${encodeURIComponent(selectedElectives.join(","))}`;
    }

    try {
        const response = await fetch(url);
        const data = await response.json();

        const grid = document.getElementById("timetableGrid");
        grid.innerHTML = "";

        if (data.requires_electives) {
            renderGlobalElectivePicker(data.available_electives);
            return;
        }

        if (data.error) {
            alert(data.error);
            return;
        }

        // Map schedule data
        const scheduleMap = {};
        const dayEntries = Array.isArray(data) 
            ? data 
            : Object.keys(data).map(day => ({ day: day, classes: data[day] }));

        dayEntries.forEach(d => {
            scheduleMap[d.day] = {};
            (d.classes || []).forEach(c => {
                const normTime = cleanTime(c.time);
                scheduleMap[d.day][normTime] = c;
            });
        });

        // Track practical slots that span across 2 time slots
        const skipSlots = {};

        // 1. Headers Row
        grid.appendChild(createHeaderCell("Time"));
        daysList.forEach(day => grid.appendChild(createHeaderCell(day)));

        // 2. Matrix Grid Rows
        standardSlots.forEach((slot, slotIndex) => {
            const timeCell = document.createElement("div");
            timeCell.className = "time-slot";
            const [timePart, meridiem] = slot.split(" ");
            timeCell.innerHTML = `<div>${timePart}</div><div>${meridiem || ''}</div>`;
            grid.appendChild(timeCell);

            daysList.forEach(day => {
                const normSlot = cleanTime(slot);

                // Skip cell rendering if this position is occupied by a 2-row practical from the previous slot
                if (skipSlots[`${day}-${normSlot}`]) {
                    return;
                }

                const cell = document.createElement("div");
                cell.className = "slot-cell";

                const cls = scheduleMap[day] && scheduleMap[day][normSlot];
                
                if (cls) {
                    const card = document.createElement("div");
                    const typeClass = (cls.type || "Lecture").toLowerCase();
                    card.className = `class-card ${typeClass}`;
                    
                    const detailsText = cls.info ? `📍 ${cls.info}` : `📍 Room: N/A`;

                    card.innerHTML = `
                        <div class="card-time">${cls.time}</div>
                        <div class="card-subject">${cls.subject}</div>
                        <div class="card-type">${cls.type}</div>
                        <div class="card-details">${detailsText}</div>
                    `;
                    cell.appendChild(card);

                    // If it's a practical, span 2 rows in the CSS grid and skip the next slot
                    if (typeClass === "practical" && slotIndex + 1 < standardSlots.length) {
                        cell.classList.add("practical-span");
                        const nextSlot = cleanTime(standardSlots[slotIndex + 1]);
                        skipSlots[`${day}-${nextSlot}`] = true;
                    }
                }

                grid.appendChild(cell);
            });
        });

    } catch (err) {
        console.error("Error loading timetable:", err);
        alert("Failed to load timetable. Check browser console.");
    }
}

function createHeaderCell(text) {
    const div = document.createElement("div");
    div.className = "grid-header";
    div.innerText = text;
    return div;
}

function renderGlobalElectivePicker(availableElectives) {
    const grid = document.getElementById("timetableGrid");
    let optionsHtml = availableElectives.map(code => `<option value="${code}">${code}</option>`).join("");

    grid.innerHTML = `
        <div style="grid-column: span 7; background: white; padding: 40px; border-radius: 12px; text-align: center; max-width: 450px; margin: 20px auto; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <h2>Select Your Elective Course</h2>
            <p style="margin: 10px 0 20px 0; color: #666;">Choose your elective course once to apply it across all days.</p>
            <select id="singleElectiveSelect" style="width: 100%; padding: 10px; border-radius: 6px; font-size: 15px; border: 1px solid #ccc; margin-bottom: 20px;">
                <option value="" disabled selected>-- Choose Course --</option>
                ${optionsHtml}
            </select>
            <button onclick="applySingleElective()" style="width: 100%;">Confirm & Generate</button>
        </div>
    `;
}

function applySingleElective() {
    const select = document.getElementById("singleElectiveSelect");
    if (!select.value) {
        alert("Please select an elective course!");
        return;
    }
    loadTimetable([select.value]);
}

/* Captures full content width regardless of mobile screen or zooming */
function downloadPNG() {
    const wrapper = document.getElementById("timetableWrapper");
    
    html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        width: wrapper.scrollWidth,
        height: wrapper.scrollHeight,
        windowWidth: wrapper.scrollWidth + 100
    }).then(canvas => {
        const link = document.createElement("a");
        link.download = "Timetable.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
    });
}

function downloadPDF() {
    const wrapper = document.getElementById("timetableWrapper");
    
    html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        width: wrapper.scrollWidth,
        height: wrapper.scrollHeight,
        windowWidth: wrapper.scrollWidth + 100
    }).then(canvas => {
        const imgData = canvas.toDataURL("image/png");
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF("landscape", "pt", "a4");
        
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(imgData, "PNG", 0, 20, pdfWidth, pdfHeight);
        pdf.save("Timetable.pdf");
    });
}