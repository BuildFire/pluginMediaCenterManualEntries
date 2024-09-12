/* eslint-disable linebreak-style */
class DialogComponent {
	constructor(id, template) {
		this.container = document.getElementById(id);
		if (!this.container) throw 'Sub Page ID not found';
		if (!this.container.classList.contains('dialog-component')) throw 'Sub Page doesnt have class [subPage]';
  
		const dialogBody = this.container.querySelector('.dialog-body');
		dialogBody.innerHTML = '';
  
		if (typeof template === 'string') {
			template = document.getElementById(`${template}`);
			template = document.importNode(template.content, true);
		} else if (!template || !(template instanceof Element) || !template.style) {
			console.error(`invalid selector ${template}.`);
			return;
		}
  
		dialogBody.appendChild(template);
  
		this.closeButton = this.container.querySelector('.close-modal');
		if (this.closeButton) {
			this.closeButton.onclick = (e) => {
				this.hideBackdrop();
				this.container.classList.remove('activeDialog');
				this.onClose(e);
			};
		}
	}
  
	show() {
		this.showBackdrop();
		this.container.classList.add('activeFull');
	}
  
	showDialog(options, saveCallback) {
		const btnSave = this.container.querySelector('.dialog-save-btn');
		btnSave.onclick = saveCallback;
  
		const btnCancelButton = this.container.querySelector('.dialog-cancel-btn');
		btnCancelButton.style.display = ''; // reset
		btnSave.style.display = ''; // reset
		this.container.querySelector('.dialog-footer').style.display = ''; // reset
		this.closeButton.style.display = '';
  
		btnCancelButton.onclick = (e) => {
			this.close(e);
		};
		if (options) {
			if (options.title) {
				const h = this.container.querySelector('.dialog-header-text');
				h.innerHTML = options.title;
			}
			if (options.saveText) {
				btnSave.innerHTML = options.saveText;
			}
  
			if (options.hideDelete) {
				btnCancelButton.style.display = 'none';
			}
			if (options.hideSave) {
				btnSave.style.display = 'none';
			}
			if (options.hideFooter) {
				this.container.querySelector('.dialog-footer').style.display = 'none';
			}
			if (options.hideCancel) {
				this.closeButton.style.display = 'none';
			}
		}
		this.showBackdrop();
		this.container.classList.add('activeDialog');
	}
  
	close(e) {
		this.hideBackdrop();
		this.container.classList.remove('activeFull');
		this.container.classList.remove('activeDialog');
		this.onClose(e);
	}
  
	showBackdrop() {
		let backdrop = document.querySelector('#dialogBackdrop');
		if (backdrop) {
			return;
		}
		backdrop = document.createElement('div');
		backdrop.setAttribute('id', 'dialogBackdrop');
		this.container.parentElement.appendChild(backdrop);
	}
  
	hideBackdrop() {
		const backdrop = document.querySelector('#dialogBackdrop');
		if (backdrop) {
			this.container.parentElement.removeChild(backdrop);
		}
	}
  
	onClose(event) {
		console.log('Dialog Closed', event);
	}
}