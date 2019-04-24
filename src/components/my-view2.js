import { LitElement, html } from 'lit-element';
//import { PageViewElement } from './page-view-element.js';

import { SharedStyles } from './shared-styles.js';
import { ButtonSharedStyles } from './button-shared-styles.js';

class MyView2 extends LitElement {

  static get properties() {
    return {
      db_version:Number
      , itemTemplates:Object
      , itemTmp:Object
    }
  }

  constructor() {
    super();
    this.db_version=1;
    this.itemTemplates = [];
    
  }
  
  static get styles() {
    return [
      SharedStyles
      , ButtonSharedStyles
    ];
  }

  render() {
    return html`
      <section style="padding:0px">
        <button id="getPict" class="get_pict" @click="${this._handleGetClick}" style="display:inline;position:absolute;right:0;">Refresh</button>
        <button id="delPict" class="del_pict" @click="${this._handleDelClick}">Delete</button>
        <div>
          ${this.itemTemplates}
        </div>
      </section>
    `;
  }

  firstUpdated(changedProperties) {
    console.log("Galery ready: ", changedProperties);
    this._handleGetClick();
  }

  _handleDelClick(e) {
    const request = window.indexedDB.open('PhoBas',this.db_version);
    request.onsuccess = (ev => {
      const objStor = ev.target.result.transaction("folder", "readwrite").objectStore("folder");

      const cb_items = this.shadowRoot.querySelectorAll('.cb_item');
      cb_items.forEach(function(cb_item){
        if (cb_item.checked) {
          const id = cb_item.id.substring("cb_item".length);
          const req_del = objStor.delete(id);
          req_del.onsuccess=function(ev_del){
            console.log(id, " deleted");
          }
        }
      });

    })
    this._handleGetClick(e);
  }

  _handleGetClick(e) {
    const request = window.indexedDB.open('PhoBas',this.db_version);

    request.onsuccess = (e => {
      const db = e.target.result;
      const objectStore = db.transaction("folder", "readonly").objectStore("folder");
      this.itemTemplates=[];
      this.itemTmp=[];
      var objDat=this;

      function logItems(e) {
        var cursor = e.target.result;
        if(cursor) {
          const id = cursor.value.id;
          const fname = cursor.value.fname;
          const img_src = URL.createObjectURL(cursor.value.blob);
          
          const itemObj = new class {
            constructor() {
              this.btnStr = "O";
            }
            _handleChkClick(e){
              this.btnStr = (this.btnStr=='O')?'X':'O';
              console.log(this.btnStr);
              //objDat.itemTemplates = []
              //objDat.itemTemplates = objDat.itemTmp;
            }
          }
          
          objDat.itemTmp.push(html`<div id="div_item${id}" class="div_item">
                <input type="checkbox" id="cb_item${id}" class="cb_item"/>
                <img id="img_item${id}" width=25% src="${img_src}" onload="() => { URL.revokeObjectURL(this.src); }"></img>
                <input type="text" value="${fname}"/>
              </div>`);
          cursor.continue();
        } else {
          objDat.itemTemplates = objDat.itemTmp;
          console.log('done!')
        }
      }

      const cur = objectStore.openCursor().onsuccess = logItems;
    });
      
    request.onerror = (e => {
      console.error('indexedDB:', e.message, e);
    });

  }
}

window.customElements.define('my-view2', MyView2);
