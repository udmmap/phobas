import { LitElement, html } from 'lit-element';

import { SharedStyles } from './shared-styles.js';
import { ButtonSharedStyles } from './button-shared-styles.js';

class MyView2 extends LitElement {

  static get properties() {
    return {
      db_version:Number
      , itemTemplates:Object
      , itemTmp:Object
      , sendObj:Object
      , logText:String
      , itemTree:Object
      , actFold:Object
    }
  }

  constructor() {
    super();
    this.db_version=document.phobas_db;
    this.itemTemplates = [];
    this.itemTree = [];
    this.sendObj = document.sendObj;
    this.logText="...";
    this.actFold={url:"",title:""};
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
        <div style="text-align:center;">
          <button id="sendPict" class="send_pict" @click="${this._handleSendClick}">Send</button>
          \ \ \ \ \ 
          <button id="getPict" class="get_pict" @click="${this._handleGetClick}">Refresh</button>
          \ \ \ \ \ 
          <button id="delPict" class="del_pict" @click="${this._handleDelClick}">Delete</button>
        </div>
        <div>
          ${this.itemTemplates}
        </div>
        <div>${this.actFold.title}\ (${this.actFold.url})</div>
        <ul style="list-style-image:url(images/folder.svg);">
          ${this.itemTree}
        </ul>
        <div id="v2-log-block"></div>
      </section>
    `;
  }

  firstUpdated(changedProperties) {
    console.log("Galery ready: ", changedProperties);
    this._handleGetClick();
  }

  _handleDelClick(e) {
    var db = openDatabase('PhoBas', this.db_version, "Photo album", 200000);
    console.log(db);

    if (db) {
      const cb_items = this.shadowRoot.querySelectorAll('.cb_item');
      cb_items.forEach(function(cb_item){
        if (cb_item.checked) {
          const id = cb_item.id.substring("cb_item".length);

          db.transaction(tx=>{
            tx.executeSql("delete from folder where id = ?"
              , [id]
              , null
              , (tx, error)=>{this.writeLog("DELETE ERROR: "+error.message);}
            )
          })
        }
      });
    }
    this._handleGetClick(e);
  }

  _handleGetClick(e) {
    var db = openDatabase('PhoBas', this.db_version, "Photo album", 200000);
    console.log(db);

    if (db) {
      this.writeLog('Database open');
      this.itemTemplates=[];
      this.itemTmp=[];
      var objDat=this;

      db.transaction(tx=>{
        tx.executeSql("SELECT * FROM folder"
          , []
          , (tx, result)=>{
            objDat.writeLog('WebSQL processing...');
            for(var kt = 0; kt < result.rows.length; kt++) {
              const id = result.rows.item(kt)['id'];
              const fname = result.rows.item(kt)['fname'];
              const blob = result.rows.item(kt)['blob'];
              //console.log(typeof blob);
              //console.log(blob);
              const img_src = blob;
              objDat.itemTmp.push(html`<div id="div_item${id}" class="div_item">
                    <input type="checkbox" id="cb_item${id}" class="cb_item" style="width:2em;height:2em"/>
                    <img id="img_item${id}" width=25% src="${img_src}"></img>
                    <input type="text" id="tx_item${id}" value="${fname}"/>
                  </div>`);
            }
            objDat.itemTemplates = objDat.itemTmp;
            objDat.writeLog('WebSQL: OK!');
          }
          , (tx, error)=>{this.writeLog("SELECT * ERROR: "+error.message);}
        )
      });

    } else {
      this.writeLog('WebSQL: error: DB is null.');
    };

    this.getTree("");
  }

  writeLog(txt) {
    console.log(txt);
    const divLog=this.shadowRoot.getElementById('v2-log-block');
/*
    if (!divLog.innerHTML) {divLog.innerHTML="";}
    if (divLog.innerHTML!=""){
      divLog.innerHTML+="<br>"
    }
*/
    divLog.innerHTML="<p>"+txt+"</p>";
  }

  cleanLog(){
    const divLog=this.shadowRoot.getElementById('v2-log-block');
    divLog.innerHTML="";
  }

  getTree(stRelativeUrl) {
    this.sendObj.getTree(this, stRelativeUrl);
  }

  _handlerIntreeClick(e){
    const fold={url:e.target.getAttribute("data-url"),title:e.target.getAttribute("data-title")};
    this.actFold=fold;
    console.log(this.actFold);
    this.getTree(this.actFold.url);
  }

  setTree(stPar, arTree) {
    const itemTmp=[];
    for (var iEl in arTree) {
      var elDir=arTree[iEl];
      itemTmp.push(html`<li data-url="${elDir.url}" data-title="${elDir.title}" @click="${e=>this._handlerIntreeClick(e)}">
        ${elDir.title}\ (${elDir.url})
      </li>`);
    }
    this.itemTree=null;
    this.itemTree=itemTmp;
  }

  _handleSendClick(e) {
    const objRoot=this;
    this.cleanLog();
    var db = openDatabase('PhoBas', this.db_version, "Photo album", 200000);
    var sendObj = this.sendObj;
    if (db) {
      const cb_items = this.shadowRoot.querySelectorAll('.cb_item');
      cb_items.forEach(function(cb_item){

        const id = cb_item.id.substring("cb_item".length);
        const chkd = cb_item.checked;
        const tx_item = objRoot.shadowRoot.querySelector('#tx_item'+id);

        db.transaction((tx)=>{
          objRoot.writeLog('Send processing...');

          tx.executeSql("UPDATE folder SET fname=? where id=?", [tx_item.value, id]
            , (tx, result)=>{objRoot.writeLog('DB updated!');}
            , (tx, error)=>{objRoot.writeLog('DB update error:' + e.message);}
          )

          if (chkd) {

            tx.executeSql("SELECT * FROM folder where id=?"
              , [id]
              , (tx, result)=>{
                for(var kt = 0; kt < result.rows.length; kt++) {
                  const rec = result.rows.item(kt);
                  sendObj.sendFile(rec, objRoot.actFold.url, objRoot);
                }
              }
              , (tx, error) => {objRoot.writeLog('DB SELECT ERROR:' + e.message)}
                
            );
          }
        })
      })
    } else {
      this.writeLog('DB open error:' + e.message);
    };
  }

}

window.customElements.define('my-view2', MyView2);
