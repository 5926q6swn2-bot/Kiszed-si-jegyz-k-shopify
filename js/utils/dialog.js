export const CustomDialog = {
        get overlay() { return typeof document !== 'undefined' ? document.getElementById('custom-dialog-overlay') : null; },
        get icon() { return typeof document !== 'undefined' ? document.getElementById('cd-icon') : null; },
        get title() { return typeof document !== 'undefined' ? document.getElementById('cd-title') : null; },
        get msg() { return typeof document !== 'undefined' ? document.getElementById('cd-msg') : null; },
        get input() { return typeof document !== 'undefined' ? document.getElementById('cd-input') : null; },
        get btnCancel() { return typeof document !== 'undefined' ? document.getElementById('cd-btn-cancel') : null; },
        get btnConfirm() { return typeof document !== 'undefined' ? document.getElementById('cd-btn-confirm') : null; },

        show: function(options) {
            return new Promise((resolve) => {
                this.title.textContent = options.title || 'Figyelem';
                this.msg.innerHTML = options.message || '';
                
                const type = options.type || 'info';
                this.icon.className = `cd-icon ${type}`;
                if(type === 'warning') this.icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
                else if(type === 'error') this.icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
                else this.icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';

                if (options.isPrompt) {
                    this.input.style.display = 'block';
                    this.input.value = options.defaultValue || '';
                    this.input.focus();
                } else {
                    this.input.style.display = 'none';
                    this.input.value = '';
                }

                if (options.isConfirm || options.isPrompt) {
                    this.btnCancel.style.display = 'block';
                    this.btnConfirm.className = `cd-btn ${options.confirmDanger ? 'cd-btn-danger' : 'cd-btn-primary'}`;
                } else {
                    this.btnCancel.style.display = 'none';
                    this.btnConfirm.className = 'cd-btn cd-btn-primary';
                }
                
                this.btnConfirm.textContent = options.confirmText || 'Rendben';

                const cleanup = () => {
                    this.overlay.classList.remove('active');
                    this.btnConfirm.removeEventListener('click', onConfirm);
                    this.btnCancel.removeEventListener('click', onCancel);
                };

                const onConfirm = () => {
                    cleanup();
                    resolve(options.isPrompt ? this.input.value : true);
                };

                const onCancel = () => {
                    cleanup();
                    resolve(options.isPrompt ? null : false);
                };

                this.btnConfirm.addEventListener('click', onConfirm);
                this.btnCancel.addEventListener('click', onCancel);
                
                this.overlay.classList.add('active');
            });
        },
        alert: function(message, title = 'Figyelem', type = 'info') {
            return this.show({ message, title, type, isConfirm: false });
        },
        confirm: function(message, title = 'Megerősítés', type = 'warning', confirmDanger = true) {
            return this.show({ message, title, type, isConfirm: true, confirmDanger });
        },
        prompt: function(message, defaultValue = '', title = 'Adatmegadás') {
            return this.show({ message, title, type: 'info', isPrompt: true, defaultValue });
        },
        choice: function(message, btn1Text, btn2Text, title = 'Választás', type = 'info') {
            return new Promise((resolve) => {
                this.title.textContent = title;
                this.msg.innerHTML = message;
                
                this.icon.className = `cd-icon ${type}`;
                if(type === 'warning') this.icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
                else this.icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';

                this.input.style.display = 'none';
                
                this.btnCancel.style.display = 'block';
                this.btnCancel.textContent = btn2Text;
                
                this.btnConfirm.className = 'cd-btn cd-btn-primary';
                this.btnConfirm.textContent = btn1Text;

                const cleanup = () => {
                    this.overlay.classList.remove('active');
                    this.btnConfirm.removeEventListener('click', onBtn1);
                    this.btnCancel.removeEventListener('click', onBtn2);
                    this.btnCancel.textContent = 'Mégsem';
                    this.btnConfirm.textContent = 'Rendben';
                };

                const onBtn1 = () => { cleanup(); resolve(1); };
                const onBtn2 = () => { cleanup(); resolve(2); };

                this.btnConfirm.addEventListener('click', onBtn1);
                this.btnCancel.addEventListener('click', onBtn2);
                
                this.overlay.classList.add('active');
            });
        }
    };