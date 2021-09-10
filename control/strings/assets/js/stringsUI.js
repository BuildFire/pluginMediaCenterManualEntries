const stringsUI = {
    container: null,
    strings: null,
    stringsConfig: null,
    _debouncers: {},
    debounce(key, fn) {
      if (this._debouncers[key]) clearTimeout(this._debouncers[key]);
      this._debouncers[key] = setTimeout(fn, 300);
    },
  
    init(containerId, strings, stringsConfig) {
      this.strings = strings;
      this.stringsConfig = stringsConfig;
      this.container = document.getElementById(containerId);
      this.container.innerHTML = "";
      for (let key in this.stringsConfig) {
        this.buildSection(this.container, key, this.stringsConfig[key]);
      }
  
      
    },
    
    onSave(prop, value) {
      this.strings.set(prop, value);
    },
  
    createAndAppend(elementType, innerHTML, classArray, parent) {
      let e = document.createElement(elementType);
      e.innerHTML = innerHTML;
      classArray.forEach((c) => e.classList.add(c));
      parent.appendChild(e);
      return e;
    },
    createIfNotEmpty(elementType, innerHTML, classArray, parent) {
      if (innerHTML)
        return this.createAndAppend(elementType, innerHTML, classArray, parent);
    },
  
    buildSection(container, sectionProp, sectionObj) {
      let sec = this.createAndAppend("section", "", [], container);
  
      this.createIfNotEmpty("h1", sectionObj.title, ["section-title"], sec);
      this.createIfNotEmpty("div", sectionObj.subtitle, ["subTitle"], sec);
      for (let key in sectionObj.labels)
        this.buildLabel(sec, sectionProp + "." + key, sectionObj.labels[key]);
      container.appendChild(sec);
    },
    buildLabel(container, prop, labelObj) {
      let rowDiv = this.createAndAppend('div', '', ["item", "row", "margin-bottom-fifteen"], container);
      let labelDiv = this.createAndAppend('div', '', [], rowDiv);
      this.createAndAppend('span', labelObj.title, ["col-md-3", "labels", "pull-left"], labelDiv); // Label Text Span
      
      let inputDiv = this.createAndAppend('div', '', ["col-md-9", "pull-left"], rowDiv);

      let inputElement;
      let id = prop;
      let inputType = labelObj.inputType ? labelObj.inputType.toLowerCase() : "";

      if (
        labelObj.inputType &&
        ["textarea", "wysiwyg"].indexOf(inputType) >= 0
      )
        inputElement = this.createAndAppend('textarea', '', ["form-control", "bf" + inputType], inputDiv);
      else {
        inputElement = this.createAndAppend('input', '', ["form-control"], inputDiv);
        inputElement.type = labelObj.inputType || "text";
      }

      inputElement.id = id;

      inputElement.autocomplete = false;
      inputElement.placeholder = labelObj.placeholder || "";
      inputElement.value = labelObj.value ? labelObj.value : labelObj.defaultValue;
  
      if (labelObj.maxLength > 0) inputElement.maxLength = labelObj.maxLength;
  
      inputElement.required = labelObj.required;
  
      inputElement.setAttribute("bfString", prop);
  
      if (inputType == "wysiwyg") {
        //handled outside by tinyMCE
      } else {
        inputElement.onkeyup = (e) => {
          stringsUI.debounce(prop, () => {
            if (inputElement.checkValidity()) {
              inputElement.classList.remove("bg-danger");
              stringsUI.onSave(
                prop,
                inputElement.value || inputElement.innerHTML
              );
            } else inputElement.classList.add("bg-danger");
          });
          e.stopPropagation();
        };
      }
  
      return inputElement;
    },
  
    scrape() {
      let obj = {};
  
      this.container.querySelectorAll("*[bfString]").forEach((e) => {
        let s = e.getAttribute("bfString").split(".");
  
        if (!obj[s[0]]) obj[s[0]] = {};
  
        if (e.type == "TEXTAREA") obj[s[0]][s[1]] = e.innerHTML;
        else obj[s[0]][s[1]] = e.value;
      });
      return obj;
    },
  };