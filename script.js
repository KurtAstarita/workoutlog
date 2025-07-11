document.addEventListener('DOMContentLoaded', function() {
    const workoutName = document.getElementById("workout-name");
    const workoutDate = document.getElementById("workout-date");
    const workoutEntries = document.getElementById("workout-entries");
    const confirmationDialog = document.getElementById("confirmation-dialog");
    const confirmYes = document.getElementById("confirm-yes");
    const confirmNo = document.getElementById("confirm-no");

    let entryToRemove = null;
    let lastSaveTime = 0;
    const saveInterval = 2000; // 2 seconds

    function validateInput(inputId, type, maxLength, required = false) {
        const input = document.getElementById(inputId);
        const value = input ? input.value : "";
        let isValid = true;
        let errorMessage = "";

        if (required && !value) {
            isValid = false;
            errorMessage = `Please fill out the ${inputId.replace('-', ' ')} field.`;
        } else if (type === 'number') {
            // Updated validation for comma-separated numbers
            const numbers = value.split(',').map(num => num.trim()).filter(num => num !== '');
            if (numbers.length > 0) {
                for (const numStr of numbers) {
                    if (isNaN(numStr) || parseFloat(numStr) < 0) {
                        isValid = false;
                        errorMessage = `Invalid number in ${inputId.replace('-', ' ')}. All values must be non-negative numbers.`;
                        break;
                    }
                }
            } else if (required) { // If required, and no numbers are entered, it's invalid
                isValid = false;
                errorMessage = `Please fill out the ${inputId.replace('-', ' ')} field with at least one number.`;
            }
        } else if (type === 'integer') {
            // Updated validation for comma-separated integers
            const integers = value.split(',').map(num => num.trim()).filter(num => num !== '');
            if (integers.length > 0) {
                for (const intStr of integers) {
                    if (!/^\d+$/.test(intStr) || parseInt(intStr) < 1) {
                        isValid = false;
                        errorMessage = `Invalid integer in ${inputId.replace('-', ' ')}. All values must be positive integers.`;
                        break;
                    }
                }
            } else if (required) { // If required, and no integers are entered, it's invalid
                isValid = false;
                errorMessage = `Please fill out the ${inputId.replace('-', ' ')} field with at least one integer.`;
            }
        } else if (type === 'text' && value.length > maxLength) {
            isValid = false;
            errorMessage = `${inputId.replace('-', ' ')} cannot exceed ${maxLength} characters.`;
        } else if (type === 'date' && isNaN(Date.parse(value))) {
            isValid = false;
            errorMessage = `Invalid date for ${inputId.replace('-', ' ')}.`;
        }

        if (!isValid && inputId) {
            alert(errorMessage);
            input.classList.add('invalid-input');
            input.focus();
            return false;
        } else if (inputId) {
            input.classList.remove('invalid-input');
        }
        return isValid;
    }

    function sanitizeInput(input) {
        return DOMPurify.sanitize(input);
    }

    document.getElementById("add-entry").addEventListener("click", () => {
        const entry = document.createElement("div");
        entry.classList.add("workout-entry");
        // Added data-type attributes for Reps and Weight inputs
        entry.innerHTML = `
            <input type="text" placeholder="Exercise" id="exercise-${Date.now()}">
            <input type="number" placeholder="Sets" min="1" id="sets-${Date.now()}">
            <input type="text" placeholder="Reps (e.g., 10,8,6)" data-type="reps" id="reps-${Date.now()}">
            <input type="text" placeholder="Weight (e.g., 100,110,120)" data-type="weight" id="weight-${Date.now()}">
            <input type="text" placeholder="Notes" id="notes-${Date.now()}">
        `;
        workoutEntries.appendChild(entry);
    });

    // New event listener for auto-adding commas
    workoutEntries.addEventListener('keyup', function(event) {
        const target = event.target;
        // Check if the target is a 'Reps' or 'Weight' input field and if the key pressed was space
        if ((target.dataset.type === 'reps' || target.dataset.type === 'weight') && event.key === ' ') {
            let value = target.value;
            // Remove the space that was just typed
            value = value.slice(0, -1);
            // Check if the last character before the space was a number
            if (value.length > 0 && /\d/.test(value.slice(-1))) {
                target.value = value + ', ';
            } else {
                target.value = value + ' '; // Re-add the space if not needed a comma
            }
        }
    });


    document.getElementById("remove-entry").addEventListener("click", () => {
        if (workoutEntries.children.length > 1) {
            entryToRemove = workoutEntries.lastChild;
            confirmationDialog.style.display = "block";
        }
    });

    confirmYes.addEventListener("click", () => {
        workoutEntries.removeChild(entryToRemove);
        confirmationDialog.style.display = "none";
        entryToRemove = null;
    });

    confirmNo.addEventListener("click", () => {
        confirmationDialog.style.display = "none";
        entryToRemove = null;
    });

    document.getElementById("save-workout").addEventListener("click", () => {
        const currentTime = Date.now();
        if (currentTime - lastSaveTime < saveInterval) {
            alert("Please wait a moment before saving again.");
            return;
        }

        if (!validateInput("workout-name", "text", 255, true) ||
            !validateInput("workout-date", "date", null, true)
        ) {
            return;
        }

        const workout = {
            name: sanitizeInput(workoutName.value),
            date: workoutDate.value,
            entries: Array.from(workoutEntries.children)
                .slice(1)
                .map(entry => {
                    const inputs = Array.from(entry.querySelectorAll("input"));
                    // Passed actual input IDs to validateInput
                    const exerciseValid = validateInput(inputs[0].id, "text", 255, true);
                    const setsValid = validateInput(inputs[1].id, "integer", null, true);
                    const repsValid = validateInput(inputs[2].id, "integer", null, true); // Still using 'integer' for reps as the validation function is modified to handle comma-separated values
                    const weightValid = validateInput(inputs[3].id, "number", null, true); // Still using 'number' for weight
                    const notesValid = validateInput(inputs[4].id, "text", 255, false);


                    if (!exerciseValid || !setsValid || !repsValid || !weightValid || !notesValid) {
                        return null;
                    }
                    return inputs.map(input => sanitizeInput(input.value));
                }).filter(entry => entry !== null)
        };

        if (!workout.name || !workout.date || workout.entries.length === 0) {
            alert("Please complete all fields before saving.");
            return;
        }

        localStorage.setItem("workoutLog", JSON.stringify(workout));
        alert("Workout log saved!");
        lastSaveTime = currentTime;
    });

    document.getElementById("load-workout").addEventListener("click", () => {
        const savedWorkout = localStorage.getItem("workoutLog");
        if (!savedWorkout) return alert("No saved workout log found.");

        const workout = JSON.parse(savedWorkout);
        workoutName.value = workout.name || "";
        workoutDate.value = workout.date || "";

        while (workoutEntries.children.length > 1) {
            workoutEntries.removeChild(workoutEntries.lastChild);
        }

        workout.entries.forEach(entry => {
            document.getElementById("add-entry").click();
            const inputFields = workoutEntries.lastChild.querySelectorAll("input");
            inputFields.forEach((input, index) => (input.value = entry[index] || ""));
        });
    });

    document.getElementById("print-pdf").addEventListener("click", () => {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            alert("jsPDF library not loaded. PDF generation is unavailable.");
            return;
        }

        const doc = new jsPDF();

        try {
            doc.text("Ultimate Workout Chart", 10, 10);
            doc.text(`Workout Name: ${workoutName.value || "Unnamed Workout"}`, 10, 20);
            doc.text(`Date: ${workoutDate.value || "No Date"}`, 10, 30);

            let headers = ["Exercise", "Sets", "Reps", "Weight", "Notes"];
            let rows = [];

            Array.from(workoutEntries.children).slice(1).forEach(entry => {
                const inputs = Array.from(entry.querySelectorAll("input"));
                let rowData = inputs.map(input => input.value || "N/A");
                rows.push(rowData);
            });

            doc.autoTable({
                head: [headers],
                body: rows,
                startY: 40,
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                },
                headStyles: {
                    fontSize: 8,
                    fillColor: [200, 200, 200],
                },
            });

            doc.save("workoutLog.pdf");
            alert("PDF generated successfully with workout data!");

        } catch (error) {
            console.error("PDF generation error:", error);
            alert("Failed to generate PDF. Please try again.");
        }
    });

    document.getElementById("download-workout").addEventListener("click", () => {
        const workout = localStorage.getItem("workoutLog");
        if (!workout) return alert("No workout log to download. Add and save entries first!");

        const blob = new Blob([workout], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "workoutLog.json";
        a.click();
        URL.revokeObjectURL(a.href);
    });

    document.getElementById("upload-workout").addEventListener("change", event => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = e => {
            try {
                const parsedData = JSON.parse(e.target.result);

                if (typeof parsedData !== 'object' || parsedData === null ||
                    !parsedData.hasOwnProperty('name') || typeof parsedData.name !== 'string' ||
                    !parsedData.hasOwnProperty('date') || typeof parsedData.date !== 'string' ||
                    !parsedData.hasOwnProperty('entries') || !Array.isArray(parsedData.entries)
                ) {
                    throw new Error("Invalid workout log structure.");
                }

                for (const entry of parsedData.entries) {
                    if (!Array.isArray(entry) || entry.length !== 5 ||
                        typeof entry[0] !== 'string' || (typeof entry[1] !== 'string' && isNaN(Number(entry[1]))) ||
                        (typeof entry[2] !== 'string' && isNaN(Number(entry[2]))) || (typeof entry[3] !== 'string' && isNaN(Number(entry[3]))) ||
                        typeof entry[4] !== 'string'
                    ) {
                        throw new Error("Invalid workout entry structure.");
                    }
                    // Ensure numeric values are treated as numbers (even if they are comma-separated strings for reps/weight)
                    // The validation will handle the parsing later
                    entry[1] = Number(entry[1]); // Sets will still be a single number
                }

                localStorage.setItem("workoutLog", JSON.stringify(parsedData));
                document.getElementById("load-workout").click();
                alert("Workout log uploaded!");

            } catch (error) {
                alert("Invalid file uploaded: " + error.message);
            }
        };
        reader.readAsText(file);
    });
});
