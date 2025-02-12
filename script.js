class TextProcessor {
    constructor() {
        this.lines = [];
        this.currentLine = '';
        this.tokens = [];
        this.currentTokenIndex = 0;
        this.processedEntries = [];
        this.textReplacements = new Map();
        this.paymentTypes = new Set();
        this.tagTypes = new Set();
        
        // Load saved data
        this.loadSavedData();
        
        // DOM elements
        this.elements = {
            fileInput: document.getElementById('fileInput'),
            currentLine: document.getElementById('currentLine'),
            nextLines: document.getElementById('nextLines'),
            remainingText: document.getElementById('remainingText'),
            csvTable: document.getElementById('csvTable').querySelector('tbody'),
            downloadBtn: document.getElementById('downloadCsv'),
            copyBtn: document.getElementById('copyToClipboard'),
            validateBtn: document.getElementById('validateBtn'),
            discardBtn: document.getElementById('discardBtn'),
            lineCounter: document.getElementById('lineCounter'),
            replacementsList: document.getElementById('replacementsList'),
            clearReplacementsBtn: document.getElementById('clearReplacements'),
            paymentSuggestions: document.getElementById('paymentSuggestions'),
            tagSuggestions: document.getElementById('tagSuggestions'),
            paymentTable: document.getElementById('paymentTable'),
            replacementsTable: document.getElementById('replacementsTable'),
            addPaymentBtn: document.getElementById('addPaymentBtn'),
            tagTable: document.getElementById('tagTable'),
            addTagBtn: document.getElementById('addTagBtn')
        };

        // Fields for CSV
        this.fields = {
            descriptionField: document.getElementById('descriptionField'),
            amountField: document.getElementById('amountField'),
            tagField: document.getElementById('tagField'),
            paymentField: document.getElementById('paymentField'),
            dateField: document.getElementById('dateField')
        };

        this.setupEventListeners();
        this.updateReplacementsDisplay();
        this.updatePaymentSuggestions();
    }

    loadSavedData() {
        const savedReplacements = localStorage.getItem('textReplacements');
        if (savedReplacements) {
            this.textReplacements = new Map(JSON.parse(savedReplacements));
        }
        
        const savedPaymentTypes = localStorage.getItem('paymentTypes');
        if (savedPaymentTypes) {
            this.paymentTypes = new Set(JSON.parse(savedPaymentTypes));
        }

        const savedTagTypes = localStorage.getItem('tagTypes');
        if (savedTagTypes) {
            this.tagTypes = new Set(JSON.parse(savedTagTypes));
        }
    }

    saveData() {
        localStorage.setItem('textReplacements', JSON.stringify([...this.textReplacements]));
        localStorage.setItem('paymentTypes', JSON.stringify([...this.paymentTypes]));
        localStorage.setItem('tagTypes', JSON.stringify([...this.tagTypes]));
    }

    setupEventListeners() {
        this.elements.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        this.elements.downloadBtn.addEventListener('click', () => this.downloadCsv());
        this.elements.copyBtn.addEventListener('click', () => this.copyToClipboard());
        this.elements.validateBtn.addEventListener('click', () => this.validateEntry());
        this.elements.discardBtn.addEventListener('click', () => this.discardCurrentToken());

        // Setup grab buttons
        document.querySelectorAll('.grab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.grabToken(btn.dataset.field, e.ctrlKey));
        });

        // Setup case buttons
        document.querySelectorAll('.case-btn').forEach(btn => {
            btn.addEventListener('click', () => this.changeTokenCase(btn.dataset.case));
        });

        // Add field change monitoring
        Object.entries(this.fields).forEach(([fieldId, element]) => {
            element.addEventListener('change', () => {
                const originalValue = element.dataset.originalValue;
                console.log('change', element.value);
                console.log('original', originalValue);
                if (originalValue && element.value !== originalValue) {
                    this.addReplacement(originalValue, element.value);
                }
                element.dataset.originalValue = '';
            });
        });

        this.elements.clearReplacementsBtn.addEventListener('click', () => {
            this.textReplacements.clear();
            this.updateReplacementsDisplay();
            this.saveData();
        });

        // Add payment field focus handling
        this.fields.paymentField.addEventListener('focus', () => {
            this.updatePaymentSuggestions();
        });

        // Add tag field focus handling
        this.fields.tagField.addEventListener('focus', () => {
            this.updateTagSuggestions();
        });

        // Add payment type handling
        this.elements.addPaymentBtn.addEventListener('click', () => {
            const newPayment = document.getElementById('newPaymentType').value.trim();
            if (newPayment) {
                this.paymentTypes.add(newPayment);
                this.updatePaymentTable();
                this.updatePaymentSuggestions();
                this.saveData();
                document.getElementById('newPaymentType').value = '';
            }
        });

        // Add tag type handling
        this.elements.addTagBtn.addEventListener('click', () => {
            const newTag = document.getElementById('newTagType').value.trim();
            if (newTag) {
                this.tagTypes.add(newTag);
                this.updateTagTable();
                this.updateTagSuggestions();
                this.saveData();
                document.getElementById('newTagType').value = '';
            }
        });
    }

    updatePaymentSuggestions() {
        this.elements.paymentSuggestions.innerHTML = '';
        [...this.paymentTypes].forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            this.elements.paymentSuggestions.appendChild(option);
        });
    }

    updateTagSuggestions() {
        this.elements.tagSuggestions.innerHTML = '';
        [...this.tagTypes].forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            this.elements.tagSuggestions.appendChild(option);
        });
    }

    updatePaymentTable() {
        const tbody = this.elements.paymentTable.querySelector('tbody');
        tbody.innerHTML = '';
        [...this.paymentTypes].sort().forEach(type => {
            const row = tbody.insertRow();
            const cell1 = row.insertCell();
            const cell2 = row.insertCell();
            cell1.textContent = type;
            cell2.innerHTML = `<button onclick="textProcessor.removePaymentType('${type}')">Remove</button>`;
        });
    }

    updateTagTable() {
        const tbody = this.elements.tagTable.querySelector('tbody');
        tbody.innerHTML = '';
        [...this.tagTypes].sort().forEach(tag => {
            const row = tbody.insertRow();
            const cell1 = row.insertCell();
            const cell2 = row.insertCell();
            cell1.textContent = tag;
            cell2.innerHTML = `<button onclick="textProcessor.removeTagType('${tag}')">Remove</button>`;
        });
    }

    removePaymentType(type) {
        this.paymentTypes.delete(type);
        this.updatePaymentTable();
        this.updatePaymentSuggestions();
        this.saveData();
    }

    removeTagType(tag) {
        this.tagTypes.delete(tag);
        this.updateTagTable();
        this.updateTagSuggestions();
        this.saveData();
    }

    addReplacement(original, replacement) {
        this.textReplacements.set(original, replacement);
        this.updateReplacementsDisplay();
        this.saveData();
    }

    updateReplacementsDisplay() {
        const tbody = this.elements.replacementsTable.querySelector('tbody');
        tbody.innerHTML = '';
        for (const [original, replacement] of this.textReplacements) {
            const row = tbody.insertRow();
            const cell1 = row.insertCell();
            const cell2 = row.insertCell();
            const cell3 = row.insertCell();
            cell1.textContent = original;
            cell2.textContent = replacement;
            cell3.innerHTML = `<button onclick="textProcessor.removeReplacement('${original}')">Remove</button>`;
        }
    }

    removeReplacement(original) {
        this.textReplacements.delete(original);
        this.updateReplacementsDisplay();
        this.saveData();
    }

    changeTokenCase(caseType) {
        if (this.currentTokenIndex >= this.tokens.length) return;
        
        const token = this.tokens[this.currentTokenIndex];
        let newText = token.text;
        
        switch(caseType) {
            case 'lower':
                newText = token.text.toLowerCase();
                break;
            case 'upper':
                newText = token.text.toUpperCase();
                break;
            case 'title':
                newText = token.text.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
                break;
        }
        
        this.tokens[this.currentTokenIndex].text = newText;
        this.updateTokenDisplay();
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const text = await file.text();
        this.lines = text.split('\n').filter(line => line.trim());
        this.elements.remainingText.textContent = this.lines.join('\n');
        this.elements.lineCounter.textContent = this.lines.length;
        this.processNextLine();
    }

    processNextLine() {
        if (this.lines.length === 0) {
            this.currentLine = '';
            this.tokens = [];
            this.updateDisplay();
            return;
        }

        this.currentLine = this.lines[0];
        this.tokens = this.currentLine.split(/\s+/)
            .filter(token => token.trim())
            .map(text => ({ text, accepted: false }));
        this.currentTokenIndex = 0;
        this.updateDisplay();
    }

    updateDisplay() {
        // Update current line tokens
        this.updateTokenDisplay();
        
        // Update next lines preview
        this.elements.nextLines.innerHTML = this.lines.slice(0, 4).reverse()
            .map((line, index, arr) => `<div class="line">>${index === arr.length - 1 ? ' ' : '> '}${line}</div>`)
            .join('');
    }

    updateTokenDisplay() {
        this.elements.currentLine.innerHTML = this.tokens.map((token, index) => {
            let className = 'token ';
            if (index === this.currentTokenIndex) {
                className += 'current';
            } else if (index < this.currentTokenIndex) {
                className += token.accepted ? 'accepted' : 'discarded';
            } else {
                className += 'queued';
            }
            return `<span class="${className}">${token.text}</span>`;
        }).join(' ');
    }

    grabToken(fieldId, isCtrlPressed) {
        if (this.currentTokenIndex >= this.tokens.length) return;

        const field = this.fields[fieldId];
        const token = this.tokens[this.currentTokenIndex];
        let value = token.text;
        if (field.value) {
            value = `${field.value} ${value}`;
        }
        field.dataset.originalValue = value;
        
        // Check for replacement
        if (this.textReplacements.has(value)) {
            value = this.textReplacements.get(value);
        }
        
        field.value = value;

        // Only update token state if not ctrl-pressed
        if (!isCtrlPressed) {
            this.tokens[this.currentTokenIndex].accepted = true;
            this.currentTokenIndex++;
            
            if (this.currentTokenIndex >= this.tokens.length) {
                this.lines.shift();
                this.elements.remainingText.textContent = this.lines.join('\n');
                this.elements.lineCounter.textContent = this.lines.length;
                this.processNextLine();
            } else {
                this.updateTokenDisplay();
            }
        }
    }

    discardCurrentToken() {
        if (this.currentTokenIndex >= this.tokens.length) return;
        
        this.tokens[this.currentTokenIndex].accepted = false;
        this.currentTokenIndex++;
        
        if (this.currentTokenIndex >= this.tokens.length) {
            this.lines.shift();
            this.elements.remainingText.textContent = this.lines.join('\n');
            this.elements.lineCounter.textContent = this.lines.length;
            this.processNextLine();
        } else {
            this.updateTokenDisplay();
        }
    }

    formatDate(dateStr) {
        // Try to parse various date formats
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr; // Return original if parsing fails
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
    }

    validateEntry() {
        const amount = this.fields.amountField.value;
        const numericAmount = parseFloat(amount.replace(',', '.').replace(/[^\d.-]/g, ''));
        
        const entry = {
            description: this.fields.descriptionField.value,
            amount: isNaN(numericAmount) ? amount : numericAmount,
            tag: this.fields.tagField.value,
            payment: this.fields.paymentField.value,
            date: this.formatDate(this.fields.dateField.value)
        };

        // Save payment type if it exists
        if (entry.payment) {
            this.paymentTypes.add(entry.payment);
            this.updatePaymentTable();
            this.updatePaymentSuggestions();
        }

        // Save tag if it exists
        if (entry.tag) {
            this.tagTypes.add(entry.tag);
            this.updateTagTable();
            this.updateTagSuggestions();
        }

        this.processedEntries.push(entry);
        this.addEntryToTable(entry);
        this.clearFields();
        this.saveData();
    }

    addEntryToTable(entry) {
        const row = this.elements.csvTable.insertRow();
        Object.values(entry).forEach(value => {
            const cell = row.insertCell();
            cell.textContent = value;
        });
    }

    clearFields() {
        Object.values(this.fields).forEach(field => field.value = '');
    }

    downloadCsv() {
        if (this.processedEntries.length === 0) return;

        const headers = ['Description', 'Amount', 'Tag', 'Payment', 'Date'];
        const csvContent = [
            headers.join(','),
            ...this.processedEntries.map(entry => 
                [entry.description, entry.amount, entry.tag, entry.payment, entry.date]
                    .map(field => `"${String(field).replace(/"/g, '""')}"`)
                    .join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'processed_entries.csv';
        link.click();
    }

    copyToClipboard() {
        if (this.processedEntries.length === 0) return;

        const headers = ['Description', 'Amount', 'Tag', 'Payment', 'Date'];
        const csvContent = [
            headers.join(','),
            ...this.processedEntries.map(entry => 
                [entry.description, entry.amount, entry.tag, entry.payment, entry.date]
                    .map(field => `"${String(field).replace(/"/g, '""')}"`)
                    .join(',')
            )
        ].join('\n');

        navigator.clipboard.writeText(csvContent)
            .then(() => alert('CSV content copied to clipboard!'))
            .catch(err => alert('Failed to copy to clipboard: ' + err));
    }
}

// Make textProcessor globally available for the replacement removal buttons
window.textProcessor = new TextProcessor();