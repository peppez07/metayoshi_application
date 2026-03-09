import{i as W,C as G,A as z,O as F,a as j,b as B,c as ot,d as c,E as H,R as L,e as D,f as Pt,g as Vn,h as ce,H as qn,j as oe,r as Q,k as pe,T as De,S as Se,M as St,l as Lt,m as Bt,n as Hn,o as Ot,w as Ue,p as Kn,q as Yn,s as Nt,t as jt,W as rt}from"./core-CEODdLY4.js";import{n as p,r as P,c as N,o as M,U as re,i as Jn,t as Gn,e as Qn,a as Xn}from"./index-Cj5O-YXS.js";import{g as Zn}from"./ui.js";import{c2 as ei}from"./bootstrap-BB2ZDjSb.js";import"./index-CHaV_rpS.js";import"./networkCapabilities-CTmxm8jd.js";var ke=function(e,t,n,o){var r=arguments.length,i=r<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,n):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(r<3?s(i):r>3?s(t,n,i):s(t,n))||i);return r>3&&i&&Object.defineProperty(t,n,i),i};let ge=class extends W{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=G.state.connectors,this.count=z.state.count,this.filteredCount=z.state.filteredWallets.length,this.isFetchingRecommendedWallets=z.state.isFetchingRecommendedWallets,this.unsubscribe.push(G.subscribeKey("connectors",e=>this.connectors=e),z.subscribeKey("count",e=>this.count=e),z.subscribeKey("filteredWallets",e=>this.filteredCount=e.length),z.subscribeKey("isFetchingRecommendedWallets",e=>this.isFetchingRecommendedWallets=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){const e=this.connectors.find(l=>l.id==="walletConnect"),{allWallets:t}=F.state;if(!e||t==="HIDE"||t==="ONLY_MOBILE"&&!j.isMobile())return null;const n=z.state.featured.length,o=this.count+n,r=o<10?o:Math.floor(o/10)*10,i=this.filteredCount>0?this.filteredCount:r;let s=`${i}`;this.filteredCount>0?s=`${this.filteredCount}`:i<o&&(s=`${i}+`);const a=B.hasAnyConnection(ot.CONNECTOR_ID.WALLET_CONNECT);return c`
      <wui-list-wallet
        name="Search Wallet"
        walletIcon="search"
        showAllWallets
        @click=${this.onAllWallets.bind(this)}
        tagLabel=${s}
        tagVariant="info"
        data-testid="all-wallets"
        tabIdx=${M(this.tabIdx)}
        .loading=${this.isFetchingRecommendedWallets}
        ?disabled=${a}
        size="sm"
      ></wui-list-wallet>
    `}onAllWallets(){var e;H.sendEvent({type:"track",event:"CLICK_ALL_WALLETS"}),L.push("AllWallets",{redirectView:(e=L.state.data)==null?void 0:e.redirectView})}};ke([p()],ge.prototype,"tabIdx",void 0),ke([P()],ge.prototype,"connectors",void 0),ke([P()],ge.prototype,"count",void 0),ke([P()],ge.prototype,"filteredCount",void 0),ke([P()],ge.prototype,"isFetchingRecommendedWallets",void 0),ge=ke([N("w3m-all-wallets-widget")],ge);const ti=D`
  :host {
    margin-top: ${({spacing:e})=>e[1]};
  }
  wui-separator {
    margin: ${({spacing:e})=>e[3]} calc(${({spacing:e})=>e[3]} * -1)
      ${({spacing:e})=>e[2]} calc(${({spacing:e})=>e[3]} * -1);
    width: calc(100% + ${({spacing:e})=>e[3]} * 2);
  }
`;var Ee=function(e,t,n,o){var r=arguments.length,i=r<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,n):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(r<3?s(i):r>3?s(t,n,i):s(t,n))||i);return r>3&&i&&Object.defineProperty(t,n,i),i};let ue=class extends W{constructor(){super(),this.unsubscribe=[],this.explorerWallets=z.state.explorerWallets,this.connections=B.state.connections,this.connectorImages=Pt.state.connectorImages,this.loadingTelegram=!1,this.unsubscribe.push(B.subscribeKey("connections",e=>this.connections=e),Pt.subscribeKey("connectorImages",e=>this.connectorImages=e),z.subscribeKey("explorerFilteredWallets",e=>{this.explorerWallets=e!=null&&e.length?e:z.state.explorerWallets}),z.subscribeKey("explorerWallets",e=>{var t;(t=this.explorerWallets)!=null&&t.length||(this.explorerWallets=e)})),j.isTelegram()&&j.isIos()&&(this.loadingTelegram=!B.state.wcUri,this.unsubscribe.push(B.subscribeKey("wcUri",e=>this.loadingTelegram=!e)))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return c`
      <wui-flex flexDirection="column" gap="2"> ${this.connectorListTemplate()} </wui-flex>
    `}connectorListTemplate(){return Vn.connectorList().map((e,t)=>e.kind==="connector"?this.renderConnector(e,t):this.renderWallet(e,t))}getConnectorNamespaces(e){var t;return e.subtype==="walletConnect"?[]:e.subtype==="multiChain"?((t=e.connector.connectors)==null?void 0:t.map(n=>n.chain))||[]:[e.connector.chain]}renderConnector(e,t){var u,k,y,h,C;const n=e.connector,o=ce.getConnectorImage(n)||this.connectorImages[(u=n==null?void 0:n.imageId)!=null?u:""],r=((k=this.connections.get(n.chain))!=null?k:[]).some(w=>qn.isLowerCaseMatch(w.connectorId,n.id));let i,s;e.subtype==="walletConnect"?(i="qr code",s="accent"):e.subtype==="injected"||e.subtype==="announced"?(i=r?"connected":"installed",s=r?"info":"success"):(i=void 0,s=void 0);const a=B.hasAnyConnection(ot.CONNECTOR_ID.WALLET_CONNECT),l=e.subtype==="walletConnect"||e.subtype==="external"?a:!1;return c`
      <w3m-list-wallet
        displayIndex=${t}
        imageSrc=${M(o)}
        .installed=${!0}
        name=${(y=n.name)!=null?y:"Unknown"}
        .tagVariant=${s}
        tagLabel=${M(i)}
        data-testid=${`wallet-selector-${n.id.toLowerCase()}`}
        size="sm"
        @click=${()=>this.onClickConnector(e)}
        tabIdx=${M(this.tabIdx)}
        ?disabled=${l}
        rdnsId=${M(((h=n.explorerWallet)==null?void 0:h.rdns)||void 0)}
        walletRank=${M((C=n.explorerWallet)==null?void 0:C.order)}
        .namespaces=${this.getConnectorNamespaces(e)}
      >
      </w3m-list-wallet>
    `}onClickConnector(e){var n;const t=(n=L.state.data)==null?void 0:n.redirectView;if(e.subtype==="walletConnect"){G.setActiveConnector(e.connector),j.isMobile()?L.push("AllWallets"):L.push("ConnectingWalletConnect",{redirectView:t});return}if(e.subtype==="multiChain"){G.setActiveConnector(e.connector),L.push("ConnectingMultiChain",{redirectView:t});return}if(e.subtype==="injected"){G.setActiveConnector(e.connector),L.push("ConnectingExternal",{connector:e.connector,redirectView:t,wallet:e.connector.explorerWallet});return}if(e.subtype==="announced"){if(e.connector.id==="walletConnect"){j.isMobile()?L.push("AllWallets"):L.push("ConnectingWalletConnect",{redirectView:t});return}L.push("ConnectingExternal",{connector:e.connector,redirectView:t,wallet:e.connector.explorerWallet});return}L.push("ConnectingExternal",{connector:e.connector,redirectView:t})}renderWallet(e,t){var l;const n=e.wallet,o=ce.getWalletImage(n),r=B.hasAnyConnection(ot.CONNECTOR_ID.WALLET_CONNECT),i=this.loadingTelegram,s=e.subtype==="recent"?"recent":void 0,a=e.subtype==="recent"?"info":void 0;return c`
      <w3m-list-wallet
        displayIndex=${t}
        imageSrc=${M(o)}
        name=${(l=n.name)!=null?l:"Unknown"}
        @click=${()=>this.onClickWallet(e)}
        size="sm"
        data-testid=${`wallet-selector-${n.id}`}
        tabIdx=${M(this.tabIdx)}
        ?loading=${i}
        ?disabled=${r}
        rdnsId=${M(n.rdns||void 0)}
        walletRank=${M(n.order)}
        tagLabel=${M(s)}
        .tagVariant=${a}
      >
      </w3m-list-wallet>
    `}onClickWallet(e){var r;const t=(r=L.state.data)==null?void 0:r.redirectView,n=oe.state.activeChain;if(e.subtype==="featured"){G.selectWalletConnector(e.wallet);return}if(e.subtype==="recent"){if(this.loadingTelegram)return;G.selectWalletConnector(e.wallet);return}if(e.subtype==="custom"){if(this.loadingTelegram)return;L.push("ConnectingWalletConnect",{wallet:e.wallet,redirectView:t});return}if(this.loadingTelegram)return;const o=n?G.getConnector({id:e.wallet.id,namespace:n}):void 0;o?L.push("ConnectingExternal",{connector:o,redirectView:t}):L.push("ConnectingWalletConnect",{wallet:e.wallet,redirectView:t})}};ue.styles=ti,Ee([p({type:Number})],ue.prototype,"tabIdx",void 0),Ee([P()],ue.prototype,"explorerWallets",void 0),Ee([P()],ue.prototype,"connections",void 0),Ee([P()],ue.prototype,"connectorImages",void 0),Ee([P()],ue.prototype,"loadingTelegram",void 0),ue=Ee([N("w3m-connector-list")],ue);const ni=D`
  :host {
    flex: 1;
    height: 100%;
  }

  button {
    width: 100%;
    height: 100%;
    display: inline-flex;
    align-items: center;
    padding: ${({spacing:e})=>e[1]} ${({spacing:e})=>e[2]};
    column-gap: ${({spacing:e})=>e[1]};
    color: ${({tokens:e})=>e.theme.textSecondary};
    border-radius: ${({borderRadius:e})=>e[20]};
    background-color: transparent;
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color;
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  button[data-active='true'] {
    color: ${({tokens:e})=>e.theme.textPrimary};
    background-color: ${({tokens:e})=>e.theme.foregroundTertiary};
  }

  button:hover:enabled:not([data-active='true']),
  button:active:enabled:not([data-active='true']) {
    wui-text,
    wui-icon {
      color: ${({tokens:e})=>e.theme.textPrimary};
    }
  }
`;var Le=function(e,t,n,o){var r=arguments.length,i=r<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,n):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(r<3?s(i):r>3?s(t,n,i):s(t,n))||i);return r>3&&i&&Object.defineProperty(t,n,i),i};const ii={lg:"lg-regular",md:"md-regular",sm:"sm-regular"},oi={lg:"md",md:"sm",sm:"sm"};let fe=class extends W{constructor(){super(...arguments),this.icon="mobile",this.size="md",this.label="",this.active=!1}render(){return c`
      <button data-active=${this.active}>
        ${this.icon?c`<wui-icon size=${oi[this.size]} name=${this.icon}></wui-icon>`:""}
        <wui-text variant=${ii[this.size]}> ${this.label} </wui-text>
      </button>
    `}};fe.styles=[Q,pe,ni],Le([p()],fe.prototype,"icon",void 0),Le([p()],fe.prototype,"size",void 0),Le([p()],fe.prototype,"label",void 0),Le([p({type:Boolean})],fe.prototype,"active",void 0),fe=Le([N("wui-tab-item")],fe);const ri=D`
  :host {
    display: inline-flex;
    align-items: center;
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    border-radius: ${({borderRadius:e})=>e[32]};
    padding: ${({spacing:e})=>e["01"]};
    box-sizing: border-box;
  }

  :host([data-size='sm']) {
    height: 26px;
  }

  :host([data-size='md']) {
    height: 36px;
  }
`;var Be=function(e,t,n,o){var r=arguments.length,i=r<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,n):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(r<3?s(i):r>3?s(t,n,i):s(t,n))||i);return r>3&&i&&Object.defineProperty(t,n,i),i};let we=class extends W{constructor(){super(...arguments),this.tabs=[],this.onTabChange=()=>null,this.size="md",this.activeTab=0}render(){return this.dataset.size=this.size,this.tabs.map((e,t)=>{var o;const n=t===this.activeTab;return c`
        <wui-tab-item
          @click=${()=>this.onTabClick(t)}
          icon=${e.icon}
          size=${this.size}
          label=${e.label}
          ?active=${n}
          data-active=${n}
          data-testid="tab-${(o=e.label)==null?void 0:o.toLowerCase()}"
        ></wui-tab-item>
      `})}onTabClick(e){this.activeTab=e,this.onTabChange(e)}};we.styles=[Q,pe,ri],Be([p({type:Array})],we.prototype,"tabs",void 0),Be([p()],we.prototype,"onTabChange",void 0),Be([p()],we.prototype,"size",void 0),Be([P()],we.prototype,"activeTab",void 0),we=Be([N("wui-tabs")],we);var st=function(e,t,n,o){var r=arguments.length,i=r<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,n):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(r<3?s(i):r>3?s(t,n,i):s(t,n))||i);return r>3&&i&&Object.defineProperty(t,n,i),i};let Fe=class extends W{constructor(){super(...arguments),this.platformTabs=[],this.unsubscribe=[],this.platforms=[],this.onSelectPlatfrom=void 0}disconnectCallback(){this.unsubscribe.forEach(e=>e())}render(){const e=this.generateTabs();return c`
      <wui-flex justifyContent="center" .padding=${["0","0","4","0"]}>
        <wui-tabs .tabs=${e} .onTabChange=${this.onTabChange.bind(this)}></wui-tabs>
      </wui-flex>
    `}generateTabs(){const e=this.platforms.map(t=>t==="browser"?{label:"Browser",icon:"extension",platform:"browser"}:t==="mobile"?{label:"Mobile",icon:"mobile",platform:"mobile"}:t==="qrcode"?{label:"Mobile",icon:"mobile",platform:"qrcode"}:t==="web"?{label:"Webapp",icon:"browser",platform:"web"}:t==="desktop"?{label:"Desktop",icon:"desktop",platform:"desktop"}:{label:"Browser",icon:"extension",platform:"unsupported"});return this.platformTabs=e.map(({platform:t})=>t),e}onTabChange(e){var n;const t=this.platformTabs[e];t&&((n=this.onSelectPlatfrom)==null||n.call(this,t))}};st([p({type:Array})],Fe.prototype,"platforms",void 0),st([p()],Fe.prototype,"onSelectPlatfrom",void 0),Fe=st([N("w3m-connecting-header")],Fe);const si=D`
  :host {
    display: block;
    width: 100px;
    height: 100px;
  }

  svg {
    width: 100px;
    height: 100px;
  }

  rect {
    fill: none;
    stroke: ${e=>e.colors.accent100};
    stroke-width: 3px;
    stroke-linecap: round;
    animation: dash 1s linear infinite;
  }

  @keyframes dash {
    to {
      stroke-dashoffset: 0px;
    }
  }
`;var Wt=function(e,t,n,o){var r=arguments.length,i=r<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,n):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(r<3?s(i):r>3?s(t,n,i):s(t,n))||i);return r>3&&i&&Object.defineProperty(t,n,i),i};let Ve=class extends W{constructor(){super(...arguments),this.radius=36}render(){return this.svgLoaderTemplate()}svgLoaderTemplate(){const e=this.radius>50?50:this.radius,t=36-e,n=116+t,o=245+t,r=360+t*1.75;return c`
      <svg viewBox="0 0 110 110" width="110" height="110">
        <rect
          x="2"
          y="2"
          width="106"
          height="106"
          rx=${e}
          stroke-dasharray="${n} ${o}"
          stroke-dashoffset=${r}
        />
      </svg>
    `}};Ve.styles=[Q,si],Wt([p({type:Number})],Ve.prototype,"radius",void 0),Ve=Wt([N("wui-loading-thumbnail")],Ve);const ai=D`
  wui-flex {
    width: 100%;
    height: 52px;
    box-sizing: border-box;
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[5]};
    padding-left: ${({spacing:e})=>e[3]};
    padding-right: ${({spacing:e})=>e[3]};
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({spacing:e})=>e[6]};
  }

  wui-text {
    color: ${({tokens:e})=>e.theme.textSecondary};
  }

  wui-icon {
    width: 12px;
    height: 12px;
  }
`;var qe=function(e,t,n,o){var r=arguments.length,i=r<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,n):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(r<3?s(i):r>3?s(t,n,i):s(t,n))||i);return r>3&&i&&Object.defineProperty(t,n,i),i};let Re=class extends W{constructor(){super(...arguments),this.disabled=!1,this.label="",this.buttonLabel=""}render(){return c`
      <wui-flex justifyContent="space-between" alignItems="center">
        <wui-text variant="lg-regular" color="inherit">${this.label}</wui-text>
        <wui-button variant="accent-secondary" size="sm">
          ${this.buttonLabel}
          <wui-icon name="chevronRight" color="inherit" size="inherit" slot="iconRight"></wui-icon>
        </wui-button>
      </wui-flex>
    `}};Re.styles=[Q,pe,ai],qe([p({type:Boolean})],Re.prototype,"disabled",void 0),qe([p()],Re.prototype,"label",void 0),qe([p()],Re.prototype,"buttonLabel",void 0),Re=qe([N("wui-cta-button")],Re);const li=D`
  :host {
    display: block;
    padding: 0 ${({spacing:e})=>e[5]} ${({spacing:e})=>e[5]};
  }
`;var Mt=function(e,t,n,o){var r=arguments.length,i=r<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,n):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(r<3?s(i):r>3?s(t,n,i):s(t,n))||i);return r>3&&i&&Object.defineProperty(t,n,i),i};let He=class extends W{constructor(){super(...arguments),this.wallet=void 0}render(){if(!this.wallet)return this.style.display="none",null;const{name:e,app_store:t,play_store:n,chrome_store:o,homepage:r}=this.wallet,i=j.isMobile(),s=j.isIos(),a=j.isAndroid(),l=[t,n,r,o].filter(Boolean).length>1,u=re.getTruncateString({string:e,charsStart:12,charsEnd:0,truncate:"end"});return l&&!i?c`
        <wui-cta-button
          label=${`Don't have ${u}?`}
          buttonLabel="Get"
          @click=${()=>L.push("Downloads",{wallet:this.wallet})}
        ></wui-cta-button>
      `:!l&&r?c`
        <wui-cta-button
          label=${`Don't have ${u}?`}
          buttonLabel="Get"
          @click=${this.onHomePage.bind(this)}
        ></wui-cta-button>
      `:t&&s?c`
        <wui-cta-button
          label=${`Don't have ${u}?`}
          buttonLabel="Get"
          @click=${this.onAppStore.bind(this)}
        ></wui-cta-button>
      `:n&&a?c`
        <wui-cta-button
          label=${`Don't have ${u}?`}
          buttonLabel="Get"
          @click=${this.onPlayStore.bind(this)}
        ></wui-cta-button>
      `:(this.style.display="none",null)}onAppStore(){var e;(e=this.wallet)!=null&&e.app_store&&j.openHref(this.wallet.app_store,"_blank")}onPlayStore(){var e;(e=this.wallet)!=null&&e.play_store&&j.openHref(this.wallet.play_store,"_blank")}onHomePage(){var e;(e=this.wallet)!=null&&e.homepage&&j.openHref(this.wallet.homepage,"_blank")}};He.styles=[li],Mt([p({type:Object})],He.prototype,"wallet",void 0),He=Mt([N("w3m-mobile-download-links")],He);const ci=D`
  @keyframes shake {
    0% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(3px);
    }
    50% {
      transform: translateX(-3px);
    }
    75% {
      transform: translateX(3px);
    }
    100% {
      transform: translateX(0);
    }
  }

  wui-flex:first-child:not(:only-child) {
    position: relative;
  }

  wui-wallet-image {
    width: 56px;
    height: 56px;
  }

  wui-loading-thumbnail {
    position: absolute;
  }

  wui-icon-box {
    position: absolute;
    right: calc(${({spacing:e})=>e[1]} * -1);
    bottom: calc(${({spacing:e})=>e[1]} * -1);
    opacity: 0;
    transform: scale(0.5);
    transition-property: opacity, transform;
    transition-duration: ${({durations:e})=>e.lg};
    transition-timing-function: ${({easings:e})=>e["ease-out-power-2"]};
    will-change: opacity, transform;
  }

  wui-text[align='center'] {
    width: 100%;
    padding: 0px ${({spacing:e})=>e[4]};
  }

  [data-error='true'] wui-icon-box {
    opacity: 1;
    transform: scale(1);
  }

  [data-error='true'] > wui-flex:first-child {
    animation: shake 250ms ${({easings:e})=>e["ease-out-power-2"]} both;
  }

  [data-retry='false'] wui-link {
    display: none;
  }

  [data-retry='true'] wui-link {
    display: block;
    opacity: 1;
  }

  w3m-mobile-download-links {
    padding: 0px;
    width: 100%;
  }
`;var X=function(e,t,n,o){var r=arguments.length,i=r<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,n):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(r<3?s(i):r>3?s(t,n,i):s(t,n))||i);return r>3&&i&&Object.defineProperty(t,n,i),i};class U extends W{constructor(){var t,n,o,r,i,s,a,l;super(),this.wallet=(t=L.state.data)==null?void 0:t.wallet,this.connector=(n=L.state.data)==null?void 0:n.connector,this.timeout=void 0,this.secondaryBtnIcon="refresh",this.onConnect=void 0,this.onRender=void 0,this.onAutoConnect=void 0,this.isWalletConnect=!0,this.unsubscribe=[],this.imageSrc=(o=ce.getConnectorImage(this.connector))!=null?o:ce.getWalletImage(this.wallet),this.name=(a=(s=(r=this.wallet)==null?void 0:r.name)!=null?s:(i=this.connector)==null?void 0:i.name)!=null?a:"Wallet",this.isRetrying=!1,this.uri=B.state.wcUri,this.error=B.state.wcError,this.ready=!1,this.showRetry=!1,this.label=void 0,this.secondaryBtnLabel="Try again",this.secondaryLabel="Accept connection request in the wallet",this.isLoading=!1,this.isMobile=!1,this.onRetry=void 0,this.unsubscribe.push(B.subscribeKey("wcUri",u=>{var k;this.uri=u,this.isRetrying&&this.onRetry&&(this.isRetrying=!1,(k=this.onConnect)==null||k.call(this))}),B.subscribeKey("wcError",u=>this.error=u)),(j.isTelegram()||j.isSafari())&&j.isIos()&&B.state.wcUri&&((l=this.onConnect)==null||l.call(this))}firstUpdated(){var t;(t=this.onAutoConnect)==null||t.call(this),this.showRetry=!this.onAutoConnect}disconnectedCallback(){this.unsubscribe.forEach(t=>t()),B.setWcError(!1),clearTimeout(this.timeout)}render(){var o;(o=this.onRender)==null||o.call(this),this.onShowRetry();const t=this.error?"Connection can be declined if a previous request is still active":this.secondaryLabel;let n="";return this.label?n=this.label:(n=`Continue in ${this.name}`,this.error&&(n="Connection declined")),c`
      <wui-flex
        data-error=${M(this.error)}
        data-retry=${this.showRetry}
        flexDirection="column"
        alignItems="center"
        .padding=${["10","5","5","5"]}
        gap="6"
      >
        <wui-flex gap="2" justifyContent="center" alignItems="center">
          <wui-wallet-image size="lg" imageSrc=${M(this.imageSrc)}></wui-wallet-image>

          ${this.error?null:this.loaderTemplate()}

          <wui-icon-box
            color="error"
            icon="close"
            size="sm"
            border
            borderColor="wui-color-bg-125"
          ></wui-icon-box>
        </wui-flex>

        <wui-flex flexDirection="column" alignItems="center" gap="6"> <wui-flex
          flexDirection="column"
          alignItems="center"
          gap="2"
          .padding=${["2","0","0","0"]}
        >
          <wui-text align="center" variant="lg-medium" color=${this.error?"error":"primary"}>
            ${n}
          </wui-text>
          <wui-text align="center" variant="lg-regular" color="secondary">${t}</wui-text>
        </wui-flex>

        ${this.secondaryBtnLabel?c`
                <wui-button
                  variant="neutral-secondary"
                  size="md"
                  ?disabled=${this.isRetrying||this.isLoading}
                  @click=${this.onTryAgain.bind(this)}
                  data-testid="w3m-connecting-widget-secondary-button"
                >
                  <wui-icon
                    color="inherit"
                    slot="iconLeft"
                    name=${this.secondaryBtnIcon}
                  ></wui-icon>
                  ${this.secondaryBtnLabel}
                </wui-button>
              `:null}
      </wui-flex>

      ${this.isWalletConnect?c`
              <wui-flex .padding=${["0","5","5","5"]} justifyContent="center">
                <wui-link
                  @click=${this.onCopyUri}
                  variant="secondary"
                  icon="copy"
                  data-testid="wui-link-copy"
                >
                  Copy link
                </wui-link>
              </wui-flex>
            `:null}

      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links></wui-flex>
      </wui-flex>
    `}onShowRetry(){var t,n;this.error&&!this.showRetry&&(this.showRetry=!0,(n=(t=this.shadowRoot)==null?void 0:t.querySelector("wui-button"))==null||n.animate([{opacity:0},{opacity:1}],{fill:"forwards",easing:"ease"}))}onTryAgain(){var t,n;B.setWcError(!1),this.onRetry?(this.isRetrying=!0,(t=this.onRetry)==null||t.call(this)):(n=this.onConnect)==null||n.call(this)}loaderTemplate(){const t=De.state.themeVariables["--w3m-border-radius-master"],n=t?parseInt(t.replace("px",""),10):4;return c`<wui-loading-thumbnail radius=${n*9}></wui-loading-thumbnail>`}onCopyUri(){try{this.uri&&(j.copyToClopboard(this.uri),Se.showSuccess("Link copied"))}catch{Se.showError("Failed to copy")}}}U.styles=ci,X([P()],U.prototype,"isRetrying",void 0),X([P()],U.prototype,"uri",void 0),X([P()],U.prototype,"error",void 0),X([P()],U.prototype,"ready",void 0),X([P()],U.prototype,"showRetry",void 0),X([P()],U.prototype,"label",void 0),X([P()],U.prototype,"secondaryBtnLabel",void 0),X([P()],U.prototype,"secondaryLabel",void 0),X([P()],U.prototype,"isLoading",void 0),X([p({type:Boolean})],U.prototype,"isMobile",void 0),X([p()],U.prototype,"onRetry",void 0);var ui=function(e,t,n,o){var r=arguments.length,i=r<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,n):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(r<3?s(i):r>3?s(t,n,i):s(t,n))||i);return r>3&&i&&Object.defineProperty(t,n,i),i};let zt=class extends U{constructor(){var e;if(super(),!this.wallet)throw new Error("w3m-connecting-wc-browser: No wallet provided");this.onConnect=this.onConnectProxy.bind(this),this.onAutoConnect=this.onConnectProxy.bind(this),H.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"browser",displayIndex:(e=this.wallet)==null?void 0:e.display_index,walletRank:this.wallet.order,view:L.state.view}})}async onConnectProxy(){var e;try{this.error=!1;const{connectors:t}=G.state,n=t.find(o=>{var r,i,s;return o.type==="ANNOUNCED"&&((r=o.info)==null?void 0:r.rdns)===((i=this.wallet)==null?void 0:i.rdns)||o.type==="INJECTED"||o.name===((s=this.wallet)==null?void 0:s.name)});if(n)await B.connectExternal(n,n.chain);else throw new Error("w3m-connecting-wc-browser: No connector found");St.close()}catch(t){t instanceof Lt&&t.originalName===Bt.PROVIDER_RPC_ERROR_NAME.USER_REJECTED_REQUEST?H.sendEvent({type:"track",event:"USER_REJECTED",properties:{message:t.message}}):H.sendEvent({type:"track",event:"CONNECT_ERROR",properties:{message:(e=t==null?void 0:t.message)!=null?e:"Unknown"}}),this.error=!0}}};zt=ui([N("w3m-connecting-wc-browser")],zt);var di=function(e,t,n,o){var r=arguments.length,i=r<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,n):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(r<3?s(i):r>3?s(t,n,i):s(t,n))||i);return r>3&&i&&Object.defineProperty(t,n,i),i};let _t=class extends U{constructor(){var e;if(super(),!this.wallet)throw new Error("w3m-connecting-wc-desktop: No wallet provided");this.onConnect=this.onConnectProxy.bind(this),this.onRender=this.onRenderProxy.bind(this),H.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"desktop",displayIndex:(e=this.wallet)==null?void 0:e.display_index,walletRank:this.wallet.order,view:L.state.view}})}onRenderProxy(){var e;!this.ready&&this.uri&&(this.ready=!0,(e=this.onConnect)==null||e.call(this))}onConnectProxy(){var e;if((e=this.wallet)!=null&&e.desktop_link&&this.uri)try{this.error=!1;const{desktop_link:t,name:n}=this.wallet,{redirect:o,href:r}=j.formatNativeUrl(t,this.uri);B.setWcLinking({name:n,href:r}),B.setRecentWallet(this.wallet),j.openHref(o,"_blank")}catch{this.error=!0}}};_t=di([N("w3m-connecting-wc-desktop")],_t);var Te=function(e,t,n,o){var r=arguments.length,i=r<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,n):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(r<3?s(i):r>3?s(t,n,i):s(t,n))||i);return r>3&&i&&Object.defineProperty(t,n,i),i};let me=class extends U{constructor(){var e;if(super(),this.btnLabelTimeout=void 0,this.redirectDeeplink=void 0,this.redirectUniversalLink=void 0,this.target=void 0,this.preferUniversalLinks=F.state.experimental_preferUniversalLinks,this.isLoading=!0,this.onConnect=()=>{Hn.onConnectMobile(this.wallet)},!this.wallet)throw new Error("w3m-connecting-wc-mobile: No wallet provided");this.secondaryBtnLabel="Open",this.secondaryLabel=Ot.CONNECT_LABELS.MOBILE,this.secondaryBtnIcon="externalLink",this.onHandleURI(),this.unsubscribe.push(B.subscribeKey("wcUri",()=>{this.onHandleURI()})),H.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"mobile",displayIndex:(e=this.wallet)==null?void 0:e.display_index,walletRank:this.wallet.order,view:L.state.view}})}disconnectedCallback(){super.disconnectedCallback(),clearTimeout(this.btnLabelTimeout)}onHandleURI(){var e;this.isLoading=!this.uri,!this.ready&&this.uri&&(this.ready=!0,(e=this.onConnect)==null||e.call(this))}onTryAgain(){var e;B.setWcError(!1),(e=this.onConnect)==null||e.call(this)}};Te([P()],me.prototype,"redirectDeeplink",void 0),Te([P()],me.prototype,"redirectUniversalLink",void 0),Te([P()],me.prototype,"target",void 0),Te([P()],me.prototype,"preferUniversalLinks",void 0),Te([P()],me.prototype,"isLoading",void 0),me=Te([N("w3m-connecting-wc-mobile")],me);var Ie={},Dt,Ut;function hi(){return Ut||(Ut=1,Dt=function(){return typeof Promise=="function"&&Promise.prototype&&Promise.prototype.then}),Dt}var at={},de={},Ft;function be(){if(Ft)return de;Ft=1;let e;const t=[0,26,44,70,100,134,172,196,242,292,346,404,466,532,581,655,733,815,901,991,1085,1156,1258,1364,1474,1588,1706,1828,1921,2051,2185,2323,2465,2611,2761,2876,3034,3196,3362,3532,3706];return de.getSymbolSize=function(n){if(!n)throw new Error('"version" cannot be null or undefined');if(n<1||n>40)throw new Error('"version" should be in range from 1 to 40');return n*4+17},de.getSymbolTotalCodewords=function(n){return t[n]},de.getBCHDigit=function(n){let o=0;for(;n!==0;)o++,n>>>=1;return o},de.setToSJISFunction=function(n){if(typeof n!="function")throw new Error('"toSJISFunc" is not a valid function.');e=n},de.isKanjiModeEnabled=function(){return typeof e<"u"},de.toSJIS=function(n){return e(n)},de}var Vt={},qt;function lt(){return qt||(qt=1,(function(e){e.L={bit:1},e.M={bit:0},e.Q={bit:3},e.H={bit:2};function t(n){if(typeof n!="string")throw new Error("Param is not a string");switch(n.toLowerCase()){case"l":case"low":return e.L;case"m":case"medium":return e.M;case"q":case"quartile":return e.Q;case"h":case"high":return e.H;default:throw new Error("Unknown EC Level: "+n)}}e.isValid=function(n){return n&&typeof n.bit<"u"&&n.bit>=0&&n.bit<4},e.from=function(n,o){if(e.isValid(n))return n;try{return t(n)}catch{return o}}})(Vt)),Vt}var ct,Ht;function pi(){if(Ht)return ct;Ht=1;function e(){this.buffer=[],this.length=0}return e.prototype={get:function(t){const n=Math.floor(t/8);return(this.buffer[n]>>>7-t%8&1)===1},put:function(t,n){for(let o=0;o<n;o++)this.putBit((t>>>n-o-1&1)===1)},getLengthInBits:function(){return this.length},putBit:function(t){const n=Math.floor(this.length/8);this.buffer.length<=n&&this.buffer.push(0),t&&(this.buffer[n]|=128>>>this.length%8),this.length++}},ct=e,ct}var ut,Kt;function gi(){if(Kt)return ut;Kt=1;function e(t){if(!t||t<1)throw new Error("BitMatrix size must be defined and greater than 0");this.size=t,this.data=new Uint8Array(t*t),this.reservedBit=new Uint8Array(t*t)}return e.prototype.set=function(t,n,o,r){const i=t*this.size+n;this.data[i]=o,r&&(this.reservedBit[i]=!0)},e.prototype.get=function(t,n){return this.data[t*this.size+n]},e.prototype.xor=function(t,n,o){this.data[t*this.size+n]^=o},e.prototype.isReserved=function(t,n){return this.reservedBit[t*this.size+n]},ut=e,ut}var Yt={},Jt;function fi(){return Jt||(Jt=1,(function(e){const t=be().getSymbolSize;e.getRowColCoords=function(n){if(n===1)return[];const o=Math.floor(n/7)+2,r=t(n),i=r===145?26:Math.ceil((r-13)/(2*o-2))*2,s=[r-7];for(let a=1;a<o-1;a++)s[a]=s[a-1]-i;return s.push(6),s.reverse()},e.getPositions=function(n){const o=[],r=e.getRowColCoords(n),i=r.length;for(let s=0;s<i;s++)for(let a=0;a<i;a++)s===0&&a===0||s===0&&a===i-1||s===i-1&&a===0||o.push([r[s],r[a]]);return o}})(Yt)),Yt}var dt={},Gt;function wi(){if(Gt)return dt;Gt=1;const e=be().getSymbolSize,t=7;return dt.getPositions=function(n){const o=e(n);return[[0,0],[o-t,0],[0,o-t]]},dt}var Qt={},Xt;function mi(){return Xt||(Xt=1,(function(e){e.Patterns={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7};const t={N1:3,N2:3,N3:40,N4:10};e.isValid=function(o){return o!=null&&o!==""&&!isNaN(o)&&o>=0&&o<=7},e.from=function(o){return e.isValid(o)?parseInt(o,10):void 0},e.getPenaltyN1=function(o){const r=o.size;let i=0,s=0,a=0,l=null,u=null;for(let k=0;k<r;k++){s=a=0,l=u=null;for(let y=0;y<r;y++){let h=o.get(k,y);h===l?s++:(s>=5&&(i+=t.N1+(s-5)),l=h,s=1),h=o.get(y,k),h===u?a++:(a>=5&&(i+=t.N1+(a-5)),u=h,a=1)}s>=5&&(i+=t.N1+(s-5)),a>=5&&(i+=t.N1+(a-5))}return i},e.getPenaltyN2=function(o){const r=o.size;let i=0;for(let s=0;s<r-1;s++)for(let a=0;a<r-1;a++){const l=o.get(s,a)+o.get(s,a+1)+o.get(s+1,a)+o.get(s+1,a+1);(l===4||l===0)&&i++}return i*t.N2},e.getPenaltyN3=function(o){const r=o.size;let i=0,s=0,a=0;for(let l=0;l<r;l++){s=a=0;for(let u=0;u<r;u++)s=s<<1&2047|o.get(l,u),u>=10&&(s===1488||s===93)&&i++,a=a<<1&2047|o.get(u,l),u>=10&&(a===1488||a===93)&&i++}return i*t.N3},e.getPenaltyN4=function(o){let r=0;const i=o.data.length;for(let s=0;s<i;s++)r+=o.data[s];return Math.abs(Math.ceil(r*100/i/5)-10)*t.N4};function n(o,r,i){switch(o){case e.Patterns.PATTERN000:return(r+i)%2===0;case e.Patterns.PATTERN001:return r%2===0;case e.Patterns.PATTERN010:return i%3===0;case e.Patterns.PATTERN011:return(r+i)%3===0;case e.Patterns.PATTERN100:return(Math.floor(r/2)+Math.floor(i/3))%2===0;case e.Patterns.PATTERN101:return r*i%2+r*i%3===0;case e.Patterns.PATTERN110:return(r*i%2+r*i%3)%2===0;case e.Patterns.PATTERN111:return(r*i%3+(r+i)%2)%2===0;default:throw new Error("bad maskPattern:"+o)}}e.applyMask=function(o,r){const i=r.size;for(let s=0;s<i;s++)for(let a=0;a<i;a++)r.isReserved(a,s)||r.xor(a,s,n(o,a,s))},e.getBestMask=function(o,r){const i=Object.keys(e.Patterns).length;let s=0,a=1/0;for(let l=0;l<i;l++){r(l),e.applyMask(l,o);const u=e.getPenaltyN1(o)+e.getPenaltyN2(o)+e.getPenaltyN3(o)+e.getPenaltyN4(o);e.applyMask(l,o),u<a&&(a=u,s=l)}return s}})(Qt)),Qt}var Ke={},Zt;function en(){if(Zt)return Ke;Zt=1;const e=lt(),t=[1,1,1,1,1,1,1,1,1,1,2,2,1,2,2,4,1,2,4,4,2,4,4,4,2,4,6,5,2,4,6,6,2,5,8,8,4,5,8,8,4,5,8,11,4,8,10,11,4,9,12,16,4,9,16,16,6,10,12,18,6,10,17,16,6,11,16,19,6,13,18,21,7,14,21,25,8,16,20,25,8,17,23,25,9,17,23,34,9,18,25,30,10,20,27,32,12,21,29,35,12,23,34,37,12,25,34,40,13,26,35,42,14,28,38,45,15,29,40,48,16,31,43,51,17,33,45,54,18,35,48,57,19,37,51,60,19,38,53,63,20,40,56,66,21,43,59,70,22,45,62,74,24,47,65,77,25,49,68,81],n=[7,10,13,17,10,16,22,28,15,26,36,44,20,36,52,64,26,48,72,88,36,64,96,112,40,72,108,130,48,88,132,156,60,110,160,192,72,130,192,224,80,150,224,264,96,176,260,308,104,198,288,352,120,216,320,384,132,240,360,432,144,280,408,480,168,308,448,532,180,338,504,588,196,364,546,650,224,416,600,700,224,442,644,750,252,476,690,816,270,504,750,900,300,560,810,960,312,588,870,1050,336,644,952,1110,360,700,1020,1200,390,728,1050,1260,420,784,1140,1350,450,812,1200,1440,480,868,1290,1530,510,924,1350,1620,540,980,1440,1710,570,1036,1530,1800,570,1064,1590,1890,600,1120,1680,1980,630,1204,1770,2100,660,1260,1860,2220,720,1316,1950,2310,750,1372,2040,2430];return Ke.getBlocksCount=function(o,r){switch(r){case e.L:return t[(o-1)*4+0];case e.M:return t[(o-1)*4+1];case e.Q:return t[(o-1)*4+2];case e.H:return t[(o-1)*4+3];default:return}},Ke.getTotalCodewordsCount=function(o,r){switch(r){case e.L:return n[(o-1)*4+0];case e.M:return n[(o-1)*4+1];case e.Q:return n[(o-1)*4+2];case e.H:return n[(o-1)*4+3];default:return}},Ke}var tn={},Oe={},nn;function bi(){if(nn)return Oe;nn=1;const e=new Uint8Array(512),t=new Uint8Array(256);return(function(){let n=1;for(let o=0;o<255;o++)e[o]=n,t[n]=o,n<<=1,n&256&&(n^=285);for(let o=255;o<512;o++)e[o]=e[o-255]})(),Oe.log=function(n){if(n<1)throw new Error("log("+n+")");return t[n]},Oe.exp=function(n){return e[n]},Oe.mul=function(n,o){return n===0||o===0?0:e[t[n]+t[o]]},Oe}var on;function yi(){return on||(on=1,(function(e){const t=bi();e.mul=function(n,o){const r=new Uint8Array(n.length+o.length-1);for(let i=0;i<n.length;i++)for(let s=0;s<o.length;s++)r[i+s]^=t.mul(n[i],o[s]);return r},e.mod=function(n,o){let r=new Uint8Array(n);for(;r.length-o.length>=0;){const i=r[0];for(let a=0;a<o.length;a++)r[a]^=t.mul(o[a],i);let s=0;for(;s<r.length&&r[s]===0;)s++;r=r.slice(s)}return r},e.generateECPolynomial=function(n){let o=new Uint8Array([1]);for(let r=0;r<n;r++)o=e.mul(o,new Uint8Array([1,t.exp(r)]));return o}})(tn)),tn}var ht,rn;function vi(){if(rn)return ht;rn=1;const e=yi();function t(n){this.genPoly=void 0,this.degree=n,this.degree&&this.initialize(this.degree)}return t.prototype.initialize=function(n){this.degree=n,this.genPoly=e.generateECPolynomial(this.degree)},t.prototype.encode=function(n){if(!this.genPoly)throw new Error("Encoder not initialized");const o=new Uint8Array(n.length+this.degree);o.set(n);const r=e.mod(o,this.genPoly),i=this.degree-r.length;if(i>0){const s=new Uint8Array(this.degree);return s.set(r,i),s}return r},ht=t,ht}var sn={},an={},ln={},cn;function un(){return cn||(cn=1,ln.isValid=function(e){return!isNaN(e)&&e>=1&&e<=40}),ln}var Z={},dn;function hn(){if(dn)return Z;dn=1;const e="[0-9]+",t="[A-Z $%*+\\-./:]+";let n="(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";n=n.replace(/u/g,"\\u");const o="(?:(?![A-Z0-9 $%*+\\-./:]|"+n+`)(?:.|[\r
]))+`;Z.KANJI=new RegExp(n,"g"),Z.BYTE_KANJI=new RegExp("[^A-Z0-9 $%*+\\-./:]+","g"),Z.BYTE=new RegExp(o,"g"),Z.NUMERIC=new RegExp(e,"g"),Z.ALPHANUMERIC=new RegExp(t,"g");const r=new RegExp("^"+n+"$"),i=new RegExp("^"+e+"$"),s=new RegExp("^[A-Z0-9 $%*+\\-./:]+$");return Z.testKanji=function(a){return r.test(a)},Z.testNumeric=function(a){return i.test(a)},Z.testAlphanumeric=function(a){return s.test(a)},Z}var pn;function ye(){return pn||(pn=1,(function(e){const t=un(),n=hn();e.NUMERIC={id:"Numeric",bit:1,ccBits:[10,12,14]},e.ALPHANUMERIC={id:"Alphanumeric",bit:2,ccBits:[9,11,13]},e.BYTE={id:"Byte",bit:4,ccBits:[8,16,16]},e.KANJI={id:"Kanji",bit:8,ccBits:[8,10,12]},e.MIXED={bit:-1},e.getCharCountIndicator=function(r,i){if(!r.ccBits)throw new Error("Invalid mode: "+r);if(!t.isValid(i))throw new Error("Invalid version: "+i);return i>=1&&i<10?r.ccBits[0]:i<27?r.ccBits[1]:r.ccBits[2]},e.getBestModeForData=function(r){return n.testNumeric(r)?e.NUMERIC:n.testAlphanumeric(r)?e.ALPHANUMERIC:n.testKanji(r)?e.KANJI:e.BYTE},e.toString=function(r){if(r&&r.id)return r.id;throw new Error("Invalid mode")},e.isValid=function(r){return r&&r.bit&&r.ccBits};function o(r){if(typeof r!="string")throw new Error("Param is not a string");switch(r.toLowerCase()){case"numeric":return e.NUMERIC;case"alphanumeric":return e.ALPHANUMERIC;case"kanji":return e.KANJI;case"byte":return e.BYTE;default:throw new Error("Unknown mode: "+r)}}e.from=function(r,i){if(e.isValid(r))return r;try{return o(r)}catch{return i}}})(an)),an}var gn;function xi(){return gn||(gn=1,(function(e){const t=be(),n=en(),o=lt(),r=ye(),i=un(),s=7973,a=t.getBCHDigit(s);function l(h,C,w){for(let v=1;v<=40;v++)if(C<=e.getCapacity(v,w,h))return v}function u(h,C){return r.getCharCountIndicator(h,C)+4}function k(h,C){let w=0;return h.forEach(function(v){const O=u(v.mode,C);w+=O+v.getBitsLength()}),w}function y(h,C){for(let w=1;w<=40;w++)if(k(h,w)<=e.getCapacity(w,C,r.MIXED))return w}e.from=function(h,C){return i.isValid(h)?parseInt(h,10):C},e.getCapacity=function(h,C,w){if(!i.isValid(h))throw new Error("Invalid QR Code version");typeof w>"u"&&(w=r.BYTE);const v=t.getSymbolTotalCodewords(h),O=n.getTotalCodewordsCount(h,C),d=(v-O)*8;if(w===r.MIXED)return d;const m=d-u(w,h);switch(w){case r.NUMERIC:return Math.floor(m/10*3);case r.ALPHANUMERIC:return Math.floor(m/11*2);case r.KANJI:return Math.floor(m/13);case r.BYTE:default:return Math.floor(m/8)}},e.getBestVersionForData=function(h,C){let w;const v=o.from(C,o.M);if(Array.isArray(h)){if(h.length>1)return y(h,v);if(h.length===0)return 1;w=h[0]}else w=h;return l(w.mode,w.getLength(),v)},e.getEncodedBits=function(h){if(!i.isValid(h)||h<7)throw new Error("Invalid QR Code version");let C=h<<12;for(;t.getBCHDigit(C)-a>=0;)C^=s<<t.getBCHDigit(C)-a;return h<<12|C}})(sn)),sn}var pt={},fn;function $i(){if(fn)return pt;fn=1;const e=be(),t=1335,n=21522,o=e.getBCHDigit(t);return pt.getEncodedBits=function(r,i){const s=r.bit<<3|i;let a=s<<10;for(;e.getBCHDigit(a)-o>=0;)a^=t<<e.getBCHDigit(a)-o;return(s<<10|a)^n},pt}var wn={},gt,mn;function Ci(){if(mn)return gt;mn=1;const e=ye();function t(n){this.mode=e.NUMERIC,this.data=n.toString()}return t.getBitsLength=function(n){return 10*Math.floor(n/3)+(n%3?n%3*3+1:0)},t.prototype.getLength=function(){return this.data.length},t.prototype.getBitsLength=function(){return t.getBitsLength(this.data.length)},t.prototype.write=function(n){let o,r,i;for(o=0;o+3<=this.data.length;o+=3)r=this.data.substr(o,3),i=parseInt(r,10),n.put(i,10);const s=this.data.length-o;s>0&&(r=this.data.substr(o),i=parseInt(r,10),n.put(i,s*3+1))},gt=t,gt}var ft,bn;function ki(){if(bn)return ft;bn=1;const e=ye(),t=["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"," ","$","%","*","+","-",".","/",":"];function n(o){this.mode=e.ALPHANUMERIC,this.data=o}return n.getBitsLength=function(o){return 11*Math.floor(o/2)+6*(o%2)},n.prototype.getLength=function(){return this.data.length},n.prototype.getBitsLength=function(){return n.getBitsLength(this.data.length)},n.prototype.write=function(o){let r;for(r=0;r+2<=this.data.length;r+=2){let i=t.indexOf(this.data[r])*45;i+=t.indexOf(this.data[r+1]),o.put(i,11)}this.data.length%2&&o.put(t.indexOf(this.data[r]),6)},ft=n,ft}var yn,vn;function Ei(){return vn||(vn=1,yn=function(e){for(var t=[],n=e.length,o=0;o<n;o++){var r=e.charCodeAt(o);if(r>=55296&&r<=56319&&n>o+1){var i=e.charCodeAt(o+1);i>=56320&&i<=57343&&(r=(r-55296)*1024+i-56320+65536,o+=1)}if(r<128){t.push(r);continue}if(r<2048){t.push(r>>6|192),t.push(r&63|128);continue}if(r<55296||r>=57344&&r<65536){t.push(r>>12|224),t.push(r>>6&63|128),t.push(r&63|128);continue}if(r>=65536&&r<=1114111){t.push(r>>18|240),t.push(r>>12&63|128),t.push(r>>6&63|128),t.push(r&63|128);continue}t.push(239,191,189)}return new Uint8Array(t).buffer}),yn}var wt,xn;function Ri(){if(xn)return wt;xn=1;const e=Ei(),t=ye();function n(o){this.mode=t.BYTE,typeof o=="string"&&(o=e(o)),this.data=new Uint8Array(o)}return n.getBitsLength=function(o){return o*8},n.prototype.getLength=function(){return this.data.length},n.prototype.getBitsLength=function(){return n.getBitsLength(this.data.length)},n.prototype.write=function(o){for(let r=0,i=this.data.length;r<i;r++)o.put(this.data[r],8)},wt=n,wt}var mt,$n;function Ti(){if($n)return mt;$n=1;const e=ye(),t=be();function n(o){this.mode=e.KANJI,this.data=o}return n.getBitsLength=function(o){return o*13},n.prototype.getLength=function(){return this.data.length},n.prototype.getBitsLength=function(){return n.getBitsLength(this.data.length)},n.prototype.write=function(o){let r;for(r=0;r<this.data.length;r++){let i=t.toSJIS(this.data[r]);if(i>=33088&&i<=40956)i-=33088;else if(i>=57408&&i<=60351)i-=49472;else throw new Error("Invalid SJIS character: "+this.data[r]+`
Make sure your charset is UTF-8`);i=(i>>>8&255)*192+(i&255),o.put(i,13)}},mt=n,mt}var Cn;function Ii(){return Cn||(Cn=1,(function(e){const t=ye(),n=Ci(),o=ki(),r=Ri(),i=Ti(),s=hn(),a=be(),l=ei();function u(d){return unescape(encodeURIComponent(d)).length}function k(d,m,f){const x=[];let _;for(;(_=d.exec(f))!==null;)x.push({data:_[0],index:_.index,mode:m,length:_[0].length});return x}function y(d){const m=k(s.NUMERIC,t.NUMERIC,d),f=k(s.ALPHANUMERIC,t.ALPHANUMERIC,d);let x,_;return a.isKanjiModeEnabled()?(x=k(s.BYTE,t.BYTE,d),_=k(s.KANJI,t.KANJI,d)):(x=k(s.BYTE_KANJI,t.BYTE,d),_=[]),m.concat(f,x,_).sort(function(g,R){return g.index-R.index}).map(function(g){return{data:g.data,mode:g.mode,length:g.length}})}function h(d,m){switch(m){case t.NUMERIC:return n.getBitsLength(d);case t.ALPHANUMERIC:return o.getBitsLength(d);case t.KANJI:return i.getBitsLength(d);case t.BYTE:return r.getBitsLength(d)}}function C(d){return d.reduce(function(m,f){const x=m.length-1>=0?m[m.length-1]:null;return x&&x.mode===f.mode?(m[m.length-1].data+=f.data,m):(m.push(f),m)},[])}function w(d){const m=[];for(let f=0;f<d.length;f++){const x=d[f];switch(x.mode){case t.NUMERIC:m.push([x,{data:x.data,mode:t.ALPHANUMERIC,length:x.length},{data:x.data,mode:t.BYTE,length:x.length}]);break;case t.ALPHANUMERIC:m.push([x,{data:x.data,mode:t.BYTE,length:x.length}]);break;case t.KANJI:m.push([x,{data:x.data,mode:t.BYTE,length:u(x.data)}]);break;case t.BYTE:m.push([{data:x.data,mode:t.BYTE,length:u(x.data)}])}}return m}function v(d,m){const f={},x={start:{}};let _=["start"];for(let g=0;g<d.length;g++){const R=d[g],A=[];for(let b=0;b<R.length;b++){const I=R[b],T=""+g+b;A.push(T),f[T]={node:I,lastCount:0},x[T]={};for(let E=0;E<_.length;E++){const $=_[E];f[$]&&f[$].node.mode===I.mode?(x[$][T]=h(f[$].lastCount+I.length,I.mode)-h(f[$].lastCount,I.mode),f[$].lastCount+=I.length):(f[$]&&(f[$].lastCount=I.length),x[$][T]=h(I.length,I.mode)+4+t.getCharCountIndicator(I.mode,m))}}_=A}for(let g=0;g<_.length;g++)x[_[g]].end=0;return{map:x,table:f}}function O(d,m){let f;const x=t.getBestModeForData(d);if(f=t.from(m,x),f!==t.BYTE&&f.bit<x.bit)throw new Error('"'+d+'" cannot be encoded with mode '+t.toString(f)+`.
 Suggested mode is: `+t.toString(x));switch(f===t.KANJI&&!a.isKanjiModeEnabled()&&(f=t.BYTE),f){case t.NUMERIC:return new n(d);case t.ALPHANUMERIC:return new o(d);case t.KANJI:return new i(d);case t.BYTE:return new r(d)}}e.fromArray=function(d){return d.reduce(function(m,f){return typeof f=="string"?m.push(O(f,null)):f.data&&m.push(O(f.data,f.mode)),m},[])},e.fromString=function(d,m){const f=y(d,a.isKanjiModeEnabled()),x=w(f),_=v(x,m),g=l.find_path(_.map,"start","end"),R=[];for(let A=1;A<g.length-1;A++)R.push(_.table[g[A]].node);return e.fromArray(C(R))},e.rawSplit=function(d){return e.fromArray(y(d,a.isKanjiModeEnabled()))}})(wn)),wn}var kn;function Ai(){if(kn)return at;kn=1;const e=be(),t=lt(),n=pi(),o=gi(),r=fi(),i=wi(),s=mi(),a=en(),l=vi(),u=xi(),k=$i(),y=ye(),h=Ii();function C(g,R){const A=g.size,b=i.getPositions(R);for(let I=0;I<b.length;I++){const T=b[I][0],E=b[I][1];for(let $=-1;$<=7;$++)if(!(T+$<=-1||A<=T+$))for(let S=-1;S<=7;S++)E+S<=-1||A<=E+S||($>=0&&$<=6&&(S===0||S===6)||S>=0&&S<=6&&($===0||$===6)||$>=2&&$<=4&&S>=2&&S<=4?g.set(T+$,E+S,!0,!0):g.set(T+$,E+S,!1,!0))}}function w(g){const R=g.size;for(let A=8;A<R-8;A++){const b=A%2===0;g.set(A,6,b,!0),g.set(6,A,b,!0)}}function v(g,R){const A=r.getPositions(R);for(let b=0;b<A.length;b++){const I=A[b][0],T=A[b][1];for(let E=-2;E<=2;E++)for(let $=-2;$<=2;$++)E===-2||E===2||$===-2||$===2||E===0&&$===0?g.set(I+E,T+$,!0,!0):g.set(I+E,T+$,!1,!0)}}function O(g,R){const A=g.size,b=u.getEncodedBits(R);let I,T,E;for(let $=0;$<18;$++)I=Math.floor($/3),T=$%3+A-8-3,E=(b>>$&1)===1,g.set(I,T,E,!0),g.set(T,I,E,!0)}function d(g,R,A){const b=g.size,I=k.getEncodedBits(R,A);let T,E;for(T=0;T<15;T++)E=(I>>T&1)===1,T<6?g.set(T,8,E,!0):T<8?g.set(T+1,8,E,!0):g.set(b-15+T,8,E,!0),T<8?g.set(8,b-T-1,E,!0):T<9?g.set(8,15-T-1+1,E,!0):g.set(8,15-T-1,E,!0);g.set(b-8,8,1,!0)}function m(g,R){const A=g.size;let b=-1,I=A-1,T=7,E=0;for(let $=A-1;$>0;$-=2)for($===6&&$--;;){for(let S=0;S<2;S++)if(!g.isReserved(I,$-S)){let le=!1;E<R.length&&(le=(R[E]>>>T&1)===1),g.set(I,$-S,le),T--,T===-1&&(E++,T=7)}if(I+=b,I<0||A<=I){I-=b,b=-b;break}}}function f(g,R,A){const b=new n;A.forEach(function(S){b.put(S.mode.bit,4),b.put(S.getLength(),y.getCharCountIndicator(S.mode,g)),S.write(b)});const I=e.getSymbolTotalCodewords(g),T=a.getTotalCodewordsCount(g,R),E=(I-T)*8;for(b.getLengthInBits()+4<=E&&b.put(0,4);b.getLengthInBits()%8!==0;)b.putBit(0);const $=(E-b.getLengthInBits())/8;for(let S=0;S<$;S++)b.put(S%2?17:236,8);return x(b,g,R)}function x(g,R,A){const b=e.getSymbolTotalCodewords(R),I=a.getTotalCodewordsCount(R,A),T=b-I,E=a.getBlocksCount(R,A),$=b%E,S=E-$,le=Math.floor(b/E),Pe=Math.floor(T/E),Dn=Pe+1,Tt=le-Pe,Un=new l(Tt);let et=0;const _e=new Array(E),It=new Array(E);let tt=0;const Fn=new Uint8Array(g.buffer);for(let Ce=0;Ce<E;Ce++){const it=Ce<S?Pe:Dn;_e[Ce]=Fn.slice(et,et+it),It[Ce]=Un.encode(_e[Ce]),et+=it,tt=Math.max(tt,it)}const nt=new Uint8Array(b);let At=0,ne,ie;for(ne=0;ne<tt;ne++)for(ie=0;ie<E;ie++)ne<_e[ie].length&&(nt[At++]=_e[ie][ne]);for(ne=0;ne<Tt;ne++)for(ie=0;ie<E;ie++)nt[At++]=It[ie][ne];return nt}function _(g,R,A,b){let I;if(Array.isArray(g))I=h.fromArray(g);else if(typeof g=="string"){let le=R;if(!le){const Pe=h.rawSplit(g);le=u.getBestVersionForData(Pe,A)}I=h.fromString(g,le||40)}else throw new Error("Invalid data");const T=u.getBestVersionForData(I,A);if(!T)throw new Error("The amount of data is too big to be stored in a QR Code");if(!R)R=T;else if(R<T)throw new Error(`
The chosen QR Code version cannot contain this amount of data.
Minimum version required to store current data is: `+T+`.
`);const E=f(R,A,I),$=e.getSymbolSize(R),S=new o($);return C(S,R),w(S),v(S,R),d(S,A,0),R>=7&&O(S,R),m(S,E),isNaN(b)&&(b=s.getBestMask(S,d.bind(null,S,A))),s.applyMask(b,S),d(S,A,b),{modules:S,version:R,errorCorrectionLevel:A,maskPattern:b,segments:I}}return at.create=function(g,R){if(typeof g>"u"||g==="")throw new Error("No input text");let A=t.M,b,I;return typeof R<"u"&&(A=t.from(R.errorCorrectionLevel,t.M),b=u.from(R.version),I=s.from(R.maskPattern),R.toSJISFunc&&e.setToSJISFunction(R.toSJISFunc)),_(g,b,A,I)},at}var En={},Rn={},Tn;function In(){return Tn||(Tn=1,(function(e){function t(n){if(typeof n=="number"&&(n=n.toString()),typeof n!="string")throw new Error("Color should be defined as hex string");let o=n.slice().replace("#","").split("");if(o.length<3||o.length===5||o.length>8)throw new Error("Invalid hex color: "+n);(o.length===3||o.length===4)&&(o=Array.prototype.concat.apply([],o.map(function(i){return[i,i]}))),o.length===6&&o.push("F","F");const r=parseInt(o.join(""),16);return{r:r>>24&255,g:r>>16&255,b:r>>8&255,a:r&255,hex:"#"+o.slice(0,6).join("")}}e.getOptions=function(n){n||(n={}),n.color||(n.color={});const o=typeof n.margin>"u"||n.margin===null||n.margin<0?4:n.margin,r=n.width&&n.width>=21?n.width:void 0,i=n.scale||4;return{width:r,scale:r?4:i,margin:o,color:{dark:t(n.color.dark||"#000000ff"),light:t(n.color.light||"#ffffffff")},type:n.type,rendererOpts:n.rendererOpts||{}}},e.getScale=function(n,o){return o.width&&o.width>=n+o.margin*2?o.width/(n+o.margin*2):o.scale},e.getImageWidth=function(n,o){const r=e.getScale(n,o);return Math.floor((n+o.margin*2)*r)},e.qrToImageData=function(n,o,r){const i=o.modules.size,s=o.modules.data,a=e.getScale(i,r),l=Math.floor((i+r.margin*2)*a),u=r.margin*a,k=[r.color.light,r.color.dark];for(let y=0;y<l;y++)for(let h=0;h<l;h++){let C=(y*l+h)*4,w=r.color.light;if(y>=u&&h>=u&&y<l-u&&h<l-u){const v=Math.floor((y-u)/a),O=Math.floor((h-u)/a);w=k[s[v*i+O]?1:0]}n[C++]=w.r,n[C++]=w.g,n[C++]=w.b,n[C]=w.a}}})(Rn)),Rn}var An;function Pi(){return An||(An=1,(function(e){const t=In();function n(r,i,s){r.clearRect(0,0,i.width,i.height),i.style||(i.style={}),i.height=s,i.width=s,i.style.height=s+"px",i.style.width=s+"px"}function o(){try{return document.createElement("canvas")}catch{throw new Error("You need to specify a canvas element")}}e.render=function(r,i,s){let a=s,l=i;typeof a>"u"&&(!i||!i.getContext)&&(a=i,i=void 0),i||(l=o()),a=t.getOptions(a);const u=t.getImageWidth(r.modules.size,a),k=l.getContext("2d"),y=k.createImageData(u,u);return t.qrToImageData(y.data,r,a),n(k,l,u),k.putImageData(y,0,0),l},e.renderToDataURL=function(r,i,s){let a=s;typeof a>"u"&&(!i||!i.getContext)&&(a=i,i=void 0),a||(a={});const l=e.render(r,i,a),u=a.type||"image/png",k=a.rendererOpts||{};return l.toDataURL(u,k.quality)}})(En)),En}var bt={},Pn;function Si(){if(Pn)return bt;Pn=1;const e=In();function t(r,i){const s=r.a/255,a=i+'="'+r.hex+'"';return s<1?a+" "+i+'-opacity="'+s.toFixed(2).slice(1)+'"':a}function n(r,i,s){let a=r+i;return typeof s<"u"&&(a+=" "+s),a}function o(r,i,s){let a="",l=0,u=!1,k=0;for(let y=0;y<r.length;y++){const h=Math.floor(y%i),C=Math.floor(y/i);!h&&!u&&(u=!0),r[y]?(k++,y>0&&h>0&&r[y-1]||(a+=u?n("M",h+s,.5+C+s):n("m",l,0),l=0,u=!1),h+1<i&&r[y+1]||(a+=n("h",k),k=0)):l++}return a}return bt.render=function(r,i,s){const a=e.getOptions(i),l=r.modules.size,u=r.modules.data,k=l+a.margin*2,y=a.color.light.a?"<path "+t(a.color.light,"fill")+' d="M0 0h'+k+"v"+k+'H0z"/>':"",h="<path "+t(a.color.dark,"stroke")+' d="'+o(u,l,a.margin)+'"/>',C='viewBox="0 0 '+k+" "+k+'"',w='<svg xmlns="http://www.w3.org/2000/svg" '+(a.width?'width="'+a.width+'" height="'+a.width+'" ':"")+C+' shape-rendering="crispEdges">'+y+h+`</svg>
`;return typeof s=="function"&&s(null,w),w},bt}var Sn;function Li(){if(Sn)return Ie;Sn=1;const e=hi(),t=Ai(),n=Pi(),o=Si();function r(i,s,a,l,u){const k=[].slice.call(arguments,1),y=k.length,h=typeof k[y-1]=="function";if(!h&&!e())throw new Error("Callback required as last argument");if(h){if(y<2)throw new Error("Too few arguments provided");y===2?(u=a,a=s,s=l=void 0):y===3&&(s.getContext&&typeof u>"u"?(u=l,l=void 0):(u=l,l=a,a=s,s=void 0))}else{if(y<1)throw new Error("Too few arguments provided");return y===1?(a=s,s=l=void 0):y===2&&!s.getContext&&(l=a,a=s,s=void 0),new Promise(function(C,w){try{const v=t.create(a,l);C(i(v,s,l))}catch(v){w(v)}})}try{const C=t.create(a,l);u(null,i(C,s,l))}catch(C){u(C)}}return Ie.create=t.create,Ie.toCanvas=r.bind(null,n.render),Ie.toDataURL=r.bind(null,n.renderToDataURL),Ie.toString=r.bind(null,function(i,s,a){return o.render(i,a)}),Ie}var Bi=Li();const Oi=Zn(Bi),Ni=.1,Ln=2.5,se=7;function yt(e,t,n){return e===t?!1:(e-t<0?t-e:e-t)<=n+Ni}function ji(e,t){const n=Array.prototype.slice.call(Oi.create(e,{errorCorrectionLevel:t}).modules.data,0),o=Math.sqrt(n.length);return n.reduce((r,i,s)=>(s%o===0?r.push([i]):r[r.length-1].push(i))&&r,[])}const Wi={generate({uri:e,size:t,logoSize:n,padding:o=8,dotColor:r="var(--apkt-colors-black)"}){const i=[],s=ji(e,"Q"),a=(t-2*o)/s.length,l=[{x:0,y:0},{x:1,y:0},{x:0,y:1}];l.forEach(({x:w,y:v})=>{const O=(s.length-se)*a*w+o,d=(s.length-se)*a*v+o,m=.45;for(let f=0;f<l.length;f+=1){const x=a*(se-f*2);i.push(Ue`
            <rect
              fill=${f===2?"var(--apkt-colors-black)":"var(--apkt-colors-white)"}
              width=${f===0?x-10:x}
              rx= ${f===0?(x-10)*m:x*m}
              ry= ${f===0?(x-10)*m:x*m}
              stroke=${r}
              stroke-width=${f===0?10:0}
              height=${f===0?x-10:x}
              x= ${f===0?d+a*f+10/2:d+a*f}
              y= ${f===0?O+a*f+10/2:O+a*f}
            />
          `)}});const u=Math.floor((n+25)/a),k=s.length/2-u/2,y=s.length/2+u/2-1,h=[];s.forEach((w,v)=>{w.forEach((O,d)=>{if(s[v][d]&&!(v<se&&d<se||v>s.length-(se+1)&&d<se||v<se&&d>s.length-(se+1))&&!(v>k&&v<y&&d>k&&d<y)){const m=v*a+a/2+o,f=d*a+a/2+o;h.push([m,f])}})});const C={};return h.forEach(([w,v])=>{var O;C[w]?(O=C[w])==null||O.push(v):C[w]=[v]}),Object.entries(C).map(([w,v])=>{const O=v.filter(d=>v.every(m=>!yt(d,m,a)));return[Number(w),O]}).forEach(([w,v])=>{v.forEach(O=>{i.push(Ue`<circle cx=${w} cy=${O} fill=${r} r=${a/Ln} />`)})}),Object.entries(C).filter(([w,v])=>v.length>1).map(([w,v])=>{const O=v.filter(d=>v.some(m=>yt(d,m,a)));return[Number(w),O]}).map(([w,v])=>{v.sort((d,m)=>d<m?-1:1);const O=[];for(const d of v){const m=O.find(f=>f.some(x=>yt(d,x,a)));m?m.push(d):O.push([d])}return[w,O.map(d=>[d[0],d[d.length-1]])]}).forEach(([w,v])=>{v.forEach(([O,d])=>{i.push(Ue`
              <line
                x1=${w}
                x2=${w}
                y1=${O}
                y2=${d}
                stroke=${r}
                stroke-width=${a/(Ln/2)}
                stroke-linecap="round"
              />
            `)})}),i}},Mi=D`
  :host {
    position: relative;
    user-select: none;
    display: block;
    overflow: hidden;
    aspect-ratio: 1 / 1;
    width: 100%;
    height: 100%;
    background-color: ${({colors:e})=>e.white};
    border: 1px solid ${({tokens:e})=>e.theme.borderPrimary};
  }

  :host {
    border-radius: ${({borderRadius:e})=>e[4]};
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :host([data-clear='true']) > wui-icon {
    display: none;
  }

  svg:first-child,
  wui-image,
  wui-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translateY(-50%) translateX(-50%);
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    box-shadow: inset 0 0 0 4px ${({tokens:e})=>e.theme.backgroundPrimary};
    border-radius: ${({borderRadius:e})=>e[6]};
  }

  wui-image {
    width: 25%;
    height: 25%;
    border-radius: ${({borderRadius:e})=>e[2]};
  }

  wui-icon {
    width: 100%;
    height: 100%;
    color: #3396ff !important;
    transform: translateY(-50%) translateX(-50%) scale(0.25);
  }

  wui-icon > svg {
    width: inherit;
    height: inherit;
  }
`;var he=function(e,t,n,o){var r=arguments.length,i=r<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,n):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(r<3?s(i):r>3?s(t,n,i):s(t,n))||i);return r>3&&i&&Object.defineProperty(t,n,i),i};let ee=class extends W{constructor(){super(...arguments),this.uri="",this.size=500,this.theme="dark",this.imageSrc=void 0,this.alt=void 0,this.arenaClear=void 0,this.farcaster=void 0}render(){return this.dataset.theme=this.theme,this.dataset.clear=String(this.arenaClear),c`<wui-flex
      alignItems="center"
      justifyContent="center"
      class="wui-qr-code"
      direction="column"
      gap="4"
      width="100%"
      style="height: 100%"
    >
      ${this.templateVisual()} ${this.templateSvg()}
    </wui-flex>`}templateSvg(){return Ue`
      <svg viewBox="0 0 ${this.size} ${this.size}" width="100%" height="100%">
        ${Wi.generate({uri:this.uri,size:this.size,logoSize:this.arenaClear?0:this.size/4})}
      </svg>
    `}templateVisual(){var e;return this.imageSrc?c`<wui-image src=${this.imageSrc} alt=${(e=this.alt)!=null?e:"logo"}></wui-image>`:this.farcaster?c`<wui-icon
        class="farcaster"
        size="inherit"
        color="inherit"
        name="farcaster"
      ></wui-icon>`:c`<wui-icon size="inherit" color="inherit" name="walletConnect"></wui-icon>`}};ee.styles=[Q,Mi],he([p()],ee.prototype,"uri",void 0),he([p({type:Number})],ee.prototype,"size",void 0),he([p()],ee.prototype,"theme",void 0),he([p()],ee.prototype,"imageSrc",void 0),he([p()],ee.prototype,"alt",void 0),he([p({type:Boolean})],ee.prototype,"arenaClear",void 0),he([p({type:Boolean})],ee.prototype,"farcaster",void 0),ee=he([N("wui-qr-code")],ee);const zi=D`
  wui-shimmer {
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: ${({borderRadius:e})=>e[4]};
  }

  wui-qr-code {
    opacity: 0;
    animation-duration: ${({durations:e})=>e.xl};
    animation-timing-function: ${({easings:e})=>e["ease-out-power-2"]};
    animation-name: fade-in;
    animation-fill-mode: forwards;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;var Bn=function(e,t,n,o){var r=arguments.length,i=r<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,n):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(r<3?s(i):r>3?s(t,n,i):s(t,n))||i);return r>3&&i&&Object.defineProperty(t,n,i),i};let Ye=class extends U{constructor(){super(),this.basic=!1}firstUpdated(){var e,t,n,o;this.basic||H.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:(t=(e=this.wallet)==null?void 0:e.name)!=null?t:"WalletConnect",platform:"qrcode",displayIndex:(n=this.wallet)==null?void 0:n.display_index,walletRank:(o=this.wallet)==null?void 0:o.order,view:L.state.view}})}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this.unsubscribe)==null||e.forEach(t=>t())}render(){return this.onRenderProxy(),c`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${["0","5","5","5"]}
        gap="5"
      >
        <wui-shimmer width="100%"> ${this.qrCodeTemplate()} </wui-shimmer>
        <wui-text variant="lg-medium" color="primary"> Scan this QR Code with your phone </wui-text>
        ${this.copyTemplate()}
      </wui-flex>
      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links>
    `}onRenderProxy(){!this.ready&&this.uri&&(this.ready=!0)}qrCodeTemplate(){var n;if(!this.uri||!this.ready)return null;const e=this.wallet?this.wallet.name:void 0;B.setWcLinking(void 0),B.setRecentWallet(this.wallet);const t=(n=De.state.themeVariables["--apkt-qr-color"])!=null?n:De.state.themeVariables["--w3m-qr-color"];return c` <wui-qr-code
      theme=${De.state.themeMode}
      uri=${this.uri}
      imageSrc=${M(ce.getWalletImage(this.wallet))}
      color=${M(t)}
      alt=${M(e)}
      data-testid="wui-qr-code"
    ></wui-qr-code>`}copyTemplate(){const e=!this.uri||!this.ready;return c`<wui-button
      .disabled=${e}
      @click=${this.onCopyUri}
      variant="neutral-secondary"
      size="sm"
      data-testid="copy-wc2-uri"
    >
      Copy link
      <wui-icon size="sm" color="inherit" name="copy" slot="iconRight"></wui-icon>
    </wui-button>`}};Ye.styles=zi,Bn([p({type:Boolean})],Ye.prototype,"basic",void 0),Ye=Bn([N("w3m-connecting-wc-qrcode")],Ye);var _i=function(e,t,n,o){var r=arguments.length,i=r<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,n):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(r<3?s(i):r>3?s(t,n,i):s(t,n))||i);return r>3&&i&&Object.defineProperty(t,n,i),i};let On=class extends W{constructor(){var e,t,n;if(super(),this.wallet=(e=L.state.data)==null?void 0:e.wallet,!this.wallet)throw new Error("w3m-connecting-wc-unsupported: No wallet provided");H.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"browser",displayIndex:(t=this.wallet)==null?void 0:t.display_index,walletRank:(n=this.wallet)==null?void 0:n.order,view:L.state.view}})}render(){return c`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${["10","5","5","5"]}
        gap="5"
      >
        <wui-wallet-image
          size="lg"
          imageSrc=${M(ce.getWalletImage(this.wallet))}
        ></wui-wallet-image>

        <wui-text variant="md-regular" color="primary">Not Detected</wui-text>
      </wui-flex>

      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links>
    `}};On=_i([N("w3m-connecting-wc-unsupported")],On);var Nn=function(e,t,n,o){var r=arguments.length,i=r<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,n):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(r<3?s(i):r>3?s(t,n,i):s(t,n))||i);return r>3&&i&&Object.defineProperty(t,n,i),i};let vt=class extends U{constructor(){var e,t;if(super(),this.isLoading=!0,!this.wallet)throw new Error("w3m-connecting-wc-web: No wallet provided");this.onConnect=this.onConnectProxy.bind(this),this.secondaryBtnLabel="Open",this.secondaryLabel=Ot.CONNECT_LABELS.MOBILE,this.secondaryBtnIcon="externalLink",this.updateLoadingState(),this.unsubscribe.push(B.subscribeKey("wcUri",()=>{this.updateLoadingState()})),H.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"web",displayIndex:(e=this.wallet)==null?void 0:e.display_index,walletRank:(t=this.wallet)==null?void 0:t.order,view:L.state.view}})}updateLoadingState(){this.isLoading=!this.uri}onConnectProxy(){var e;if((e=this.wallet)!=null&&e.webapp_link&&this.uri)try{this.error=!1;const{webapp_link:t,name:n}=this.wallet,{redirect:o,href:r}=j.formatUniversalUrl(t,this.uri);B.setWcLinking({name:n,href:r}),B.setRecentWallet(this.wallet),j.openHref(o,"_blank")}catch{this.error=!0}}};Nn([P()],vt.prototype,"isLoading",void 0),vt=Nn([N("w3m-connecting-wc-web")],vt);const Di=D`
  :host([data-mobile-fullscreen='true']) {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  :host([data-mobile-fullscreen='true']) wui-ux-by-reown {
    margin-top: auto;
  }
`;var ve=function(e,t,n,o){var r=arguments.length,i=r<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,n):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(r<3?s(i):r>3?s(t,n,i):s(t,n))||i);return r>3&&i&&Object.defineProperty(t,n,i),i};let ae=class extends W{constructor(){var e;super(),this.wallet=(e=L.state.data)==null?void 0:e.wallet,this.unsubscribe=[],this.platform=void 0,this.platforms=[],this.isSiwxEnabled=!!F.state.siwx,this.remoteFeatures=F.state.remoteFeatures,this.displayBranding=!0,this.basic=!1,this.determinePlatforms(),this.initializeConnection(),this.unsubscribe.push(F.subscribeKey("remoteFeatures",t=>this.remoteFeatures=t))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return F.state.enableMobileFullScreen&&this.setAttribute("data-mobile-fullscreen","true"),c`
      ${this.headerTemplate()}
      <div class="platform-container">${this.platformTemplate()}</div>
      ${this.reownBrandingTemplate()}
    `}reownBrandingTemplate(){var e;return!((e=this.remoteFeatures)!=null&&e.reownBranding)||!this.displayBranding?null:c`<wui-ux-by-reown></wui-ux-by-reown>`}async initializeConnection(e=!1){var t,n,o,r,i;if(!(this.platform==="browser"||F.state.manualWCControl&&!e))try{const{wcPairingExpiry:s,status:a}=B.state,{redirectView:l}=(t=L.state.data)!=null?t:{};if(e||F.state.enableEmbedded||j.isPairingExpired(s)||a==="connecting"){const u=B.getConnections(oe.state.activeChain),k=(n=this.remoteFeatures)==null?void 0:n.multiWallet,y=u.length>0;await B.connectWalletConnect({cache:"never"}),this.isSiwxEnabled||(y&&k?(L.replace("ProfileWallets"),Se.showSuccess("New Wallet Added")):l?L.replace(l):St.close())}}catch(s){if(s instanceof Error&&s.message.includes("An error occurred when attempting to switch chain")&&!F.state.enableNetworkSwitch&&oe.state.activeChain){oe.setActiveCaipNetwork(Kn.getUnsupportedNetwork(`${oe.state.activeChain}:${(o=oe.state.activeCaipNetwork)==null?void 0:o.id}`)),oe.showUnsupportedChainUI();return}s instanceof Lt&&s.originalName===Bt.PROVIDER_RPC_ERROR_NAME.USER_REJECTED_REQUEST?H.sendEvent({type:"track",event:"USER_REJECTED",properties:{message:s.message}}):H.sendEvent({type:"track",event:"CONNECT_ERROR",properties:{message:(r=s==null?void 0:s.message)!=null?r:"Unknown"}}),B.setWcError(!0),Se.showError((i=s.message)!=null?i:"Connection error"),B.resetWcConnection(),L.goBack()}}determinePlatforms(){if(!this.wallet){this.platforms.push("qrcode"),this.platform="qrcode";return}if(this.platform)return;const{mobile_link:e,desktop_link:t,webapp_link:n,injected:o,rdns:r}=this.wallet,i=o==null?void 0:o.map(({injected_id:C})=>C).filter(Boolean),s=[...r?[r]:i!=null?i:[]],a=F.state.isUniversalProvider?!1:s.length,l=e,u=n,k=B.checkInstalled(s),y=a&&k,h=t&&!j.isMobile();y&&!oe.state.noAdapters&&this.platforms.push("browser"),l&&this.platforms.push(j.isMobile()?"mobile":"qrcode"),u&&this.platforms.push("web"),h&&this.platforms.push("desktop"),!y&&a&&!oe.state.noAdapters&&this.platforms.push("unsupported"),this.platform=this.platforms[0]}platformTemplate(){switch(this.platform){case"browser":return c`<w3m-connecting-wc-browser></w3m-connecting-wc-browser>`;case"web":return c`<w3m-connecting-wc-web></w3m-connecting-wc-web>`;case"desktop":return c`
          <w3m-connecting-wc-desktop .onRetry=${()=>this.initializeConnection(!0)}>
          </w3m-connecting-wc-desktop>
        `;case"mobile":return c`
          <w3m-connecting-wc-mobile isMobile .onRetry=${()=>this.initializeConnection(!0)}>
          </w3m-connecting-wc-mobile>
        `;case"qrcode":return c`<w3m-connecting-wc-qrcode ?basic=${this.basic}></w3m-connecting-wc-qrcode>`;default:return c`<w3m-connecting-wc-unsupported></w3m-connecting-wc-unsupported>`}}headerTemplate(){return this.platforms.length>1?c`
      <w3m-connecting-header
        .platforms=${this.platforms}
        .onSelectPlatfrom=${this.onSelectPlatform.bind(this)}
      >
      </w3m-connecting-header>
    `:null}async onSelectPlatform(e){var n;const t=(n=this.shadowRoot)==null?void 0:n.querySelector("div");t&&(await t.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.platform=e,t.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"}))}};ae.styles=Di,ve([P()],ae.prototype,"platform",void 0),ve([P()],ae.prototype,"platforms",void 0),ve([P()],ae.prototype,"isSiwxEnabled",void 0),ve([P()],ae.prototype,"remoteFeatures",void 0),ve([p({type:Boolean})],ae.prototype,"displayBranding",void 0),ve([p({type:Boolean})],ae.prototype,"basic",void 0),ae=ve([N("w3m-connecting-wc-view")],ae);var xt=function(e,t,n,o){var r=arguments.length,i=r<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,n):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(r<3?s(i):r>3?s(t,n,i):s(t,n))||i);return r>3&&i&&Object.defineProperty(t,n,i),i};let Ne=class extends W{constructor(){super(),this.unsubscribe=[],this.isMobile=j.isMobile(),this.remoteFeatures=F.state.remoteFeatures,this.unsubscribe.push(F.subscribeKey("remoteFeatures",e=>this.remoteFeatures=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){if(this.isMobile){const{featured:e,recommended:t}=z.state,{customWallets:n}=F.state,o=Yn.getRecentWallets(),r=e.length||t.length||(n==null?void 0:n.length)||o.length;return c`<wui-flex flexDirection="column" gap="2" .margin=${["1","3","3","3"]}>
        ${r?c`<w3m-connector-list></w3m-connector-list>`:null}
        <w3m-all-wallets-widget></w3m-all-wallets-widget>
      </wui-flex>`}return c`<wui-flex flexDirection="column" .padding=${["0","0","4","0"]}>
        <w3m-connecting-wc-view ?basic=${!0} .displayBranding=${!1}></w3m-connecting-wc-view>
        <wui-flex flexDirection="column" .padding=${["0","3","0","3"]}>
          <w3m-all-wallets-widget></w3m-all-wallets-widget>
        </wui-flex>
      </wui-flex>
      ${this.reownBrandingTemplate()} `}reownBrandingTemplate(){var e;return(e=this.remoteFeatures)!=null&&e.reownBranding?c` <wui-flex flexDirection="column" .padding=${["1","0","1","0"]}>
      <wui-ux-by-reown></wui-ux-by-reown>
    </wui-flex>`:null}};xt([P()],Ne.prototype,"isMobile",void 0),xt([P()],Ne.prototype,"remoteFeatures",void 0),Ne=xt([N("w3m-connecting-wc-basic-view")],Ne);const Ui=e=>e.strings===void 0,je=(e,t)=>{var o;const n=e._$AN;if(n===void 0)return!1;for(const r of n)(o=r._$AO)==null||o.call(r,t,!1),je(r,t);return!0},Je=e=>{let t,n;do{if((t=e._$AM)===void 0)break;n=t._$AN,n.delete(e),e=t}while((n==null?void 0:n.size)===0)},jn=e=>{for(let t;t=e._$AM;e=t){let n=t._$AN;if(n===void 0)t._$AN=n=new Set;else if(n.has(e))break;n.add(e),qi(t)}};function Fi(e){this._$AN!==void 0?(Je(this),this._$AM=e,jn(this)):this._$AM=e}function Vi(e,t=!1,n=0){const o=this._$AH,r=this._$AN;if(r!==void 0&&r.size!==0)if(t)if(Array.isArray(o))for(let i=n;i<o.length;i++)je(o[i],!1),Je(o[i]);else o!=null&&(je(o,!1),Je(o));else je(this,e)}const qi=e=>{var t,n;e.type==Gn.CHILD&&((t=e._$AP)!=null||(e._$AP=Vi),(n=e._$AQ)!=null||(e._$AQ=Fi))};class Hi extends Jn{constructor(){super(...arguments),this._$AN=void 0}_$AT(t,n,o){super._$AT(t,n,o),jn(this),this.isConnected=t._$AU}_$AO(t,n=!0){var o,r;t!==this.isConnected&&(this.isConnected=t,t?(o=this.reconnected)==null||o.call(this):(r=this.disconnected)==null||r.call(this)),n&&(je(this,t),Je(this))}setValue(t){if(Ui(this._$Ct))this._$Ct._$AI(t,this);else{const n=[...this._$Ct._$AH];n[this._$Ci]=t,this._$Ct._$AI(n,this,0)}}disconnected(){}reconnected(){}}const $t=()=>new Ki;class Ki{}const Ct=new WeakMap,kt=Qn(class extends Hi{render(e){return Nt}update(e,[t]){var o;const n=t!==this.G;return n&&this.G!==void 0&&this.rt(void 0),(n||this.lt!==this.ct)&&(this.G=t,this.ht=(o=e.options)==null?void 0:o.host,this.rt(this.ct=e.element)),Nt}rt(e){var t;if(this.isConnected||(e=void 0),typeof this.G=="function"){const n=(t=this.ht)!=null?t:globalThis;let o=Ct.get(n);o===void 0&&(o=new WeakMap,Ct.set(n,o)),o.get(this.G)!==void 0&&this.G.call(this.ht,void 0),o.set(this.G,e),e!==void 0&&this.G.call(this.ht,e)}else this.G.value=e}get lt(){var e,t,n;return typeof this.G=="function"?(t=Ct.get((e=this.ht)!=null?e:globalThis))==null?void 0:t.get(this.G):(n=this.G)==null?void 0:n.value}disconnected(){this.lt===this.ct&&this.rt(void 0)}reconnected(){this.rt(this.ct)}}),Yi=D`
  :host {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  label {
    position: relative;
    display: inline-block;
    user-select: none;
    transition:
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      color ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      border ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      box-shadow ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      width ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      height ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      transform ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      opacity ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color, color, border, box-shadow, width, height, transform, opacity;
  }

  input {
    width: 0;
    height: 0;
    opacity: 0;
  }

  span {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${({colors:e})=>e.neutrals300};
    border-radius: ${({borderRadius:e})=>e.round};
    border: 1px solid transparent;
    will-change: border;
    transition:
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      color ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      border ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      box-shadow ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      width ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      height ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      transform ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      opacity ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color, color, border, box-shadow, width, height, transform, opacity;
  }

  span:before {
    content: '';
    position: absolute;
    background-color: ${({colors:e})=>e.white};
    border-radius: 50%;
  }

  /* -- Sizes --------------------------------------------------------- */
  label[data-size='lg'] {
    width: 48px;
    height: 32px;
  }

  label[data-size='md'] {
    width: 40px;
    height: 28px;
  }

  label[data-size='sm'] {
    width: 32px;
    height: 22px;
  }

  label[data-size='lg'] > span:before {
    height: 24px;
    width: 24px;
    left: 4px;
    top: 3px;
  }

  label[data-size='md'] > span:before {
    height: 20px;
    width: 20px;
    left: 4px;
    top: 3px;
  }

  label[data-size='sm'] > span:before {
    height: 16px;
    width: 16px;
    left: 3px;
    top: 2px;
  }

  /* -- Focus states --------------------------------------------------- */
  input:focus-visible:not(:checked) + span,
  input:focus:not(:checked) + span {
    border: 1px solid ${({tokens:e})=>e.core.iconAccentPrimary};
    background-color: ${({tokens:e})=>e.theme.textTertiary};
    box-shadow: 0px 0px 0px 4px rgba(9, 136, 240, 0.2);
  }

  input:focus-visible:checked + span,
  input:focus:checked + span {
    border: 1px solid ${({tokens:e})=>e.core.iconAccentPrimary};
    box-shadow: 0px 0px 0px 4px rgba(9, 136, 240, 0.2);
  }

  /* -- Checked states --------------------------------------------------- */
  input:checked + span {
    background-color: ${({tokens:e})=>e.core.iconAccentPrimary};
  }

  label[data-size='lg'] > input:checked + span:before {
    transform: translateX(calc(100% - 9px));
  }

  label[data-size='md'] > input:checked + span:before {
    transform: translateX(calc(100% - 9px));
  }

  label[data-size='sm'] > input:checked + span:before {
    transform: translateX(calc(100% - 7px));
  }

  /* -- Hover states ------------------------------------------------------- */
  label:hover > input:not(:checked):not(:disabled) + span {
    background-color: ${({colors:e})=>e.neutrals400};
  }

  label:hover > input:checked:not(:disabled) + span {
    background-color: ${({colors:e})=>e.accent080};
  }

  /* -- Disabled state --------------------------------------------------- */
  label:has(input:disabled) {
    pointer-events: none;
    user-select: none;
  }

  input:not(:checked):disabled + span {
    background-color: ${({colors:e})=>e.neutrals700};
  }

  input:checked:disabled + span {
    background-color: ${({colors:e})=>e.neutrals700};
  }

  input:not(:checked):disabled + span::before {
    background-color: ${({colors:e})=>e.neutrals400};
  }

  input:checked:disabled + span::before {
    background-color: ${({tokens:e})=>e.theme.textTertiary};
  }
`;var Ge=function(e,t,n,o){var r=arguments.length,i=r<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,n):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(r<3?s(i):r>3?s(t,n,i):s(t,n))||i);return r>3&&i&&Object.defineProperty(t,n,i),i};let Ae=class extends W{constructor(){super(...arguments),this.inputElementRef=$t(),this.checked=!1,this.disabled=!1,this.size="md"}render(){return c`
      <label data-size=${this.size}>
        <input
          ${kt(this.inputElementRef)}
          type="checkbox"
          ?checked=${this.checked}
          ?disabled=${this.disabled}
          @change=${this.dispatchChangeEvent.bind(this)}
        />
        <span></span>
      </label>
    `}dispatchChangeEvent(){var e;this.dispatchEvent(new CustomEvent("switchChange",{detail:(e=this.inputElementRef.value)==null?void 0:e.checked,bubbles:!0,composed:!0}))}};Ae.styles=[Q,pe,Yi],Ge([p({type:Boolean})],Ae.prototype,"checked",void 0),Ge([p({type:Boolean})],Ae.prototype,"disabled",void 0),Ge([p()],Ae.prototype,"size",void 0),Ae=Ge([N("wui-toggle")],Ae);const Ji=D`
  :host {
    height: auto;
  }

  :host > wui-flex {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    column-gap: ${({spacing:e})=>e[2]};
    padding: ${({spacing:e})=>e[2]} ${({spacing:e})=>e[3]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[4]};
    box-shadow: inset 0 0 0 1px ${({tokens:e})=>e.theme.foregroundPrimary};
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color;
    cursor: pointer;
  }

  wui-switch {
    pointer-events: none;
  }
`;var Wn=function(e,t,n,o){var r=arguments.length,i=r<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,n):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(r<3?s(i):r>3?s(t,n,i):s(t,n))||i);return r>3&&i&&Object.defineProperty(t,n,i),i};let Qe=class extends W{constructor(){super(...arguments),this.checked=!1}render(){return c`
      <wui-flex>
        <wui-icon size="xl" name="walletConnectBrown"></wui-icon>
        <wui-toggle
          ?checked=${this.checked}
          size="sm"
          @switchChange=${this.handleToggleChange.bind(this)}
        ></wui-toggle>
      </wui-flex>
    `}handleToggleChange(e){e.stopPropagation(),this.checked=e.detail,this.dispatchSwitchEvent()}dispatchSwitchEvent(){this.dispatchEvent(new CustomEvent("certifiedSwitchChange",{detail:this.checked,bubbles:!0,composed:!0}))}};Qe.styles=[Q,pe,Ji],Wn([p({type:Boolean})],Qe.prototype,"checked",void 0),Qe=Wn([N("wui-certified-switch")],Qe);const Gi=D`
  :host {
    position: relative;
    width: 100%;
    display: inline-flex;
    flex-direction: column;
    gap: ${({spacing:e})=>e[3]};
    color: ${({tokens:e})=>e.theme.textPrimary};
    caret-color: ${({tokens:e})=>e.core.textAccentPrimary};
  }

  .wui-input-text-container {
    position: relative;
    display: flex;
  }

  input {
    width: 100%;
    border-radius: ${({borderRadius:e})=>e[4]};
    color: inherit;
    background: transparent;
    border: 1px solid ${({tokens:e})=>e.theme.borderPrimary};
    caret-color: ${({tokens:e})=>e.core.textAccentPrimary};
    padding: ${({spacing:e})=>e[3]} ${({spacing:e})=>e[3]}
      ${({spacing:e})=>e[3]} ${({spacing:e})=>e[10]};
    font-size: ${({textSize:e})=>e.large};
    line-height: ${({typography:e})=>e["lg-regular"].lineHeight};
    letter-spacing: ${({typography:e})=>e["lg-regular"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.regular};
    font-family: ${({fontFamily:e})=>e.regular};
  }

  input[data-size='lg'] {
    padding: ${({spacing:e})=>e[4]} ${({spacing:e})=>e[3]}
      ${({spacing:e})=>e[4]} ${({spacing:e})=>e[10]};
  }

  @media (hover: hover) and (pointer: fine) {
    input:hover:enabled {
      border: 1px solid ${({tokens:e})=>e.theme.borderSecondary};
    }
  }

  input:disabled {
    cursor: unset;
    border: 1px solid ${({tokens:e})=>e.theme.borderPrimary};
  }

  input::placeholder {
    color: ${({tokens:e})=>e.theme.textSecondary};
  }

  input:focus:enabled {
    border: 1px solid ${({tokens:e})=>e.theme.borderSecondary};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    -webkit-box-shadow: 0px 0px 0px 4px ${({tokens:e})=>e.core.foregroundAccent040};
    -moz-box-shadow: 0px 0px 0px 4px ${({tokens:e})=>e.core.foregroundAccent040};
    box-shadow: 0px 0px 0px 4px ${({tokens:e})=>e.core.foregroundAccent040};
  }

  div.wui-input-text-container:has(input:disabled) {
    opacity: 0.5;
  }

  wui-icon.wui-input-text-left-icon {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    left: ${({spacing:e})=>e[4]};
    color: ${({tokens:e})=>e.theme.iconDefault};
  }

  button.wui-input-text-submit-button {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: ${({spacing:e})=>e[3]};
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    border-radius: ${({borderRadius:e})=>e[2]};
    color: ${({tokens:e})=>e.core.textAccentPrimary};
  }

  button.wui-input-text-submit-button:disabled {
    opacity: 1;
  }

  button.wui-input-text-submit-button.loading wui-icon {
    animation: spin 1s linear infinite;
  }

  button.wui-input-text-submit-button:hover {
    background: ${({tokens:e})=>e.core.foregroundAccent010};
  }

  input:has(+ .wui-input-text-submit-button) {
    padding-right: ${({spacing:e})=>e[12]};
  }

  input[type='number'] {
    -moz-appearance: textfield;
  }

  input[type='search']::-webkit-search-decoration,
  input[type='search']::-webkit-search-cancel-button,
  input[type='search']::-webkit-search-results-button,
  input[type='search']::-webkit-search-results-decoration {
    -webkit-appearance: none;
  }

  /* -- Keyframes --------------------------------------------------- */
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;var K=function(e,t,n,o){var r=arguments.length,i=r<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,n):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(r<3?s(i):r>3?s(t,n,i):s(t,n))||i);return r>3&&i&&Object.defineProperty(t,n,i),i};let V=class extends W{constructor(){super(...arguments),this.inputElementRef=$t(),this.disabled=!1,this.loading=!1,this.placeholder="",this.type="text",this.value="",this.size="md"}render(){return c` <div class="wui-input-text-container">
        ${this.templateLeftIcon()}
        <input
          data-size=${this.size}
          ${kt(this.inputElementRef)}
          data-testid="wui-input-text"
          type=${this.type}
          enterkeyhint=${M(this.enterKeyHint)}
          ?disabled=${this.disabled}
          placeholder=${this.placeholder}
          @input=${this.dispatchInputChangeEvent.bind(this)}
          @keydown=${this.onKeyDown}
          .value=${this.value||""}
        />
        ${this.templateSubmitButton()}
        <slot class="wui-input-text-slot"></slot>
      </div>
      ${this.templateError()} ${this.templateWarning()}`}templateLeftIcon(){return this.icon?c`<wui-icon
        class="wui-input-text-left-icon"
        size="md"
        data-size=${this.size}
        color="inherit"
        name=${this.icon}
      ></wui-icon>`:null}templateSubmitButton(){var e;return this.onSubmit?c`<button
        class="wui-input-text-submit-button ${this.loading?"loading":""}"
        @click=${(e=this.onSubmit)==null?void 0:e.bind(this)}
        ?disabled=${this.disabled||this.loading}
      >
        ${this.loading?c`<wui-icon name="spinner" size="md"></wui-icon>`:c`<wui-icon name="chevronRight" size="md"></wui-icon>`}
      </button>`:null}templateError(){return this.errorText?c`<wui-text variant="sm-regular" color="error">${this.errorText}</wui-text>`:null}templateWarning(){return this.warningText?c`<wui-text variant="sm-regular" color="warning">${this.warningText}</wui-text>`:null}dispatchInputChangeEvent(){var e;this.dispatchEvent(new CustomEvent("inputChange",{detail:(e=this.inputElementRef.value)==null?void 0:e.value,bubbles:!0,composed:!0}))}};V.styles=[Q,pe,Gi],K([p()],V.prototype,"icon",void 0),K([p({type:Boolean})],V.prototype,"disabled",void 0),K([p({type:Boolean})],V.prototype,"loading",void 0),K([p()],V.prototype,"placeholder",void 0),K([p()],V.prototype,"type",void 0),K([p()],V.prototype,"value",void 0),K([p()],V.prototype,"errorText",void 0),K([p()],V.prototype,"warningText",void 0),K([p()],V.prototype,"onSubmit",void 0),K([p()],V.prototype,"size",void 0),K([p({attribute:!1})],V.prototype,"onKeyDown",void 0),V=K([N("wui-input-text")],V);const Qi=D`
  :host {
    position: relative;
    display: inline-block;
    width: 100%;
  }

  wui-icon {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: ${({spacing:e})=>e[3]};
    color: ${({tokens:e})=>e.theme.iconDefault};
    cursor: pointer;
    padding: ${({spacing:e})=>e[2]};
    background-color: transparent;
    border-radius: ${({borderRadius:e})=>e[4]};
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
  }

  @media (hover: hover) {
    wui-icon:hover {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
  }
`;var Mn=function(e,t,n,o){var r=arguments.length,i=r<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,n):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(r<3?s(i):r>3?s(t,n,i):s(t,n))||i);return r>3&&i&&Object.defineProperty(t,n,i),i};let Xe=class extends W{constructor(){super(...arguments),this.inputComponentRef=$t(),this.inputValue=""}render(){return c`
      <wui-input-text
        ${kt(this.inputComponentRef)}
        placeholder="Search wallet"
        icon="search"
        type="search"
        enterKeyHint="search"
        size="sm"
        @inputChange=${this.onInputChange}
      >
        ${this.inputValue?c`<wui-icon
              @click=${this.clearValue}
              color="inherit"
              size="sm"
              name="close"
            ></wui-icon>`:null}
      </wui-input-text>
    `}onInputChange(e){this.inputValue=e.detail||""}clearValue(){var t;const e=(t=this.inputComponentRef.value)==null?void 0:t.inputElementRef.value;e&&(e.value="",this.inputValue="",e.focus(),e.dispatchEvent(new Event("input")))}};Xe.styles=[Q,Qi],Mn([p()],Xe.prototype,"inputValue",void 0),Xe=Mn([N("wui-search-bar")],Xe);const Xi=D`
  :host {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 104px;
    width: 104px;
    row-gap: ${({spacing:e})=>e[2]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[5]};
    position: relative;
  }

  wui-shimmer[data-type='network'] {
    border: none;
    -webkit-clip-path: var(--apkt-path-network);
    clip-path: var(--apkt-path-network);
  }

  svg {
    position: absolute;
    width: 48px;
    height: 54px;
    z-index: 1;
  }

  svg > path {
    stroke: ${({tokens:e})=>e.theme.foregroundSecondary};
    stroke-width: 1px;
  }

  @media (max-width: 350px) {
    :host {
      width: 100%;
    }
  }
`;var zn=function(e,t,n,o){var r=arguments.length,i=r<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,n):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(r<3?s(i):r>3?s(t,n,i):s(t,n))||i);return r>3&&i&&Object.defineProperty(t,n,i),i};let Ze=class extends W{constructor(){super(...arguments),this.type="wallet"}render(){return c`
      ${this.shimmerTemplate()}
      <wui-shimmer width="80px" height="20px"></wui-shimmer>
    `}shimmerTemplate(){return this.type==="network"?c` <wui-shimmer data-type=${this.type} width="48px" height="54px"></wui-shimmer>
        ${Xn}`:c`<wui-shimmer width="56px" height="56px"></wui-shimmer>`}};Ze.styles=[Q,pe,Xi],zn([p()],Ze.prototype,"type",void 0),Ze=zn([N("wui-card-select-loader")],Ze);const Zi=jt`
  :host {
    display: grid;
    width: inherit;
    height: inherit;
  }
`;var Y=function(e,t,n,o){var r=arguments.length,i=r<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,n):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(r<3?s(i):r>3?s(t,n,i):s(t,n))||i);return r>3&&i&&Object.defineProperty(t,n,i),i};let q=class extends W{render(){return this.style.cssText=`
      grid-template-rows: ${this.gridTemplateRows};
      grid-template-columns: ${this.gridTemplateColumns};
      justify-items: ${this.justifyItems};
      align-items: ${this.alignItems};
      justify-content: ${this.justifyContent};
      align-content: ${this.alignContent};
      column-gap: ${this.columnGap&&`var(--apkt-spacing-${this.columnGap})`};
      row-gap: ${this.rowGap&&`var(--apkt-spacing-${this.rowGap})`};
      gap: ${this.gap&&`var(--apkt-spacing-${this.gap})`};
      padding-top: ${this.padding&&re.getSpacingStyles(this.padding,0)};
      padding-right: ${this.padding&&re.getSpacingStyles(this.padding,1)};
      padding-bottom: ${this.padding&&re.getSpacingStyles(this.padding,2)};
      padding-left: ${this.padding&&re.getSpacingStyles(this.padding,3)};
      margin-top: ${this.margin&&re.getSpacingStyles(this.margin,0)};
      margin-right: ${this.margin&&re.getSpacingStyles(this.margin,1)};
      margin-bottom: ${this.margin&&re.getSpacingStyles(this.margin,2)};
      margin-left: ${this.margin&&re.getSpacingStyles(this.margin,3)};
    `,c`<slot></slot>`}};q.styles=[Q,Zi],Y([p()],q.prototype,"gridTemplateRows",void 0),Y([p()],q.prototype,"gridTemplateColumns",void 0),Y([p()],q.prototype,"justifyItems",void 0),Y([p()],q.prototype,"alignItems",void 0),Y([p()],q.prototype,"justifyContent",void 0),Y([p()],q.prototype,"alignContent",void 0),Y([p()],q.prototype,"columnGap",void 0),Y([p()],q.prototype,"rowGap",void 0),Y([p()],q.prototype,"gap",void 0),Y([p()],q.prototype,"padding",void 0),Y([p()],q.prototype,"margin",void 0),q=Y([N("wui-grid")],q);const eo=D`
  button {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    width: 104px;
    row-gap: ${({spacing:e})=>e[2]};
    padding: ${({spacing:e})=>e[3]} ${({spacing:e})=>e[0]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: clamp(0px, ${({borderRadius:e})=>e[4]}, 20px);
    transition:
      color ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-1"]},
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-1"]},
      border-radius ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-1"]};
    will-change: background-color, color, border-radius;
    outline: none;
    border: none;
  }

  button > wui-flex > wui-text {
    color: ${({tokens:e})=>e.theme.textPrimary};
    max-width: 86px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    justify-content: center;
  }

  button > wui-flex > wui-text.certified {
    max-width: 66px;
  }

  @media (hover: hover) and (pointer: fine) {
    button:hover:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
  }

  button:disabled > wui-flex > wui-text {
    color: ${({tokens:e})=>e.core.glass010};
  }

  [data-selected='true'] {
    background-color: ${({colors:e})=>e.accent020};
  }

  @media (hover: hover) and (pointer: fine) {
    [data-selected='true']:hover:enabled {
      background-color: ${({colors:e})=>e.accent010};
    }
  }

  [data-selected='true']:active:enabled {
    background-color: ${({colors:e})=>e.accent010};
  }

  @media (max-width: 350px) {
    button {
      width: 100%;
    }
  }
`;var te=function(e,t,n,o){var r=arguments.length,i=r<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,n):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(r<3?s(i):r>3?s(t,n,i):s(t,n))||i);return r>3&&i&&Object.defineProperty(t,n,i),i};let J=class extends W{constructor(){super(),this.observer=new IntersectionObserver(()=>{}),this.visible=!1,this.imageSrc=void 0,this.imageLoading=!1,this.isImpressed=!1,this.explorerId="",this.walletQuery="",this.certified=!1,this.displayIndex=0,this.wallet=void 0,this.observer=new IntersectionObserver(e=>{e.forEach(t=>{t.isIntersecting?(this.visible=!0,this.fetchImageSrc(),this.sendImpressionEvent()):this.visible=!1})},{threshold:.01})}firstUpdated(){this.observer.observe(this)}disconnectedCallback(){this.observer.disconnect()}render(){var t,n;const e=((t=this.wallet)==null?void 0:t.badge_type)==="certified";return c`
      <button>
        ${this.imageTemplate()}
        <wui-flex flexDirection="row" alignItems="center" justifyContent="center" gap="1">
          <wui-text
            variant="md-regular"
            color="inherit"
            class=${M(e?"certified":void 0)}
            >${(n=this.wallet)==null?void 0:n.name}</wui-text
          >
          ${e?c`<wui-icon size="sm" name="walletConnectBrown"></wui-icon>`:null}
        </wui-flex>
      </button>
    `}imageTemplate(){var e,t,n;return!this.visible&&!this.imageSrc||this.imageLoading?this.shimmerTemplate():c`
      <wui-wallet-image
        size="lg"
        imageSrc=${M(this.imageSrc)}
        name=${M((e=this.wallet)==null?void 0:e.name)}
        .installed=${(n=(t=this.wallet)==null?void 0:t.installed)!=null?n:!1}
        badgeSize="sm"
      >
      </wui-wallet-image>
    `}shimmerTemplate(){return c`<wui-shimmer width="56px" height="56px"></wui-shimmer>`}async fetchImageSrc(){this.wallet&&(this.imageSrc=ce.getWalletImage(this.wallet),!this.imageSrc&&(this.imageLoading=!0,this.imageSrc=await ce.fetchWalletImage(this.wallet.image_id),this.imageLoading=!1))}sendImpressionEvent(){!this.wallet||this.isImpressed||(this.isImpressed=!0,H.sendWalletImpressionEvent({name:this.wallet.name,walletRank:this.wallet.order,explorerId:this.explorerId,view:L.state.view,query:this.walletQuery,certified:this.certified,displayIndex:this.displayIndex}))}};J.styles=eo,te([P()],J.prototype,"visible",void 0),te([P()],J.prototype,"imageSrc",void 0),te([P()],J.prototype,"imageLoading",void 0),te([P()],J.prototype,"isImpressed",void 0),te([p()],J.prototype,"explorerId",void 0),te([p()],J.prototype,"walletQuery",void 0),te([p()],J.prototype,"certified",void 0),te([p()],J.prototype,"displayIndex",void 0),te([p({type:Object})],J.prototype,"wallet",void 0),J=te([N("w3m-all-wallets-list-item")],J);const to=D`
  wui-grid {
    max-height: clamp(360px, 400px, 80vh);
    overflow: scroll;
    scrollbar-width: none;
    grid-auto-rows: min-content;
    grid-template-columns: repeat(auto-fill, 104px);
  }

  :host([data-mobile-fullscreen='true']) wui-grid {
    max-height: none;
  }

  @media (max-width: 350px) {
    wui-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  wui-grid[data-scroll='false'] {
    overflow: hidden;
  }

  wui-grid::-webkit-scrollbar {
    display: none;
  }

  w3m-all-wallets-list-item {
    opacity: 0;
    animation-duration: ${({durations:e})=>e.xl};
    animation-timing-function: ${({easings:e})=>e["ease-inout-power-2"]};
    animation-name: fade-in;
    animation-fill-mode: forwards;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  wui-loading-spinner {
    padding-top: ${({spacing:e})=>e[4]};
    padding-bottom: ${({spacing:e})=>e[4]};
    justify-content: center;
    grid-column: 1 / span 4;
  }
`;var We=function(e,t,n,o){var r=arguments.length,i=r<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,n):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(r<3?s(i):r>3?s(t,n,i):s(t,n))||i);return r>3&&i&&Object.defineProperty(t,n,i),i};const _n="local-paginator";let xe=class extends W{constructor(){super(),this.unsubscribe=[],this.paginationObserver=void 0,this.loading=!z.state.wallets.length,this.wallets=z.state.wallets,this.mobileFullScreen=F.state.enableMobileFullScreen,this.unsubscribe.push(z.subscribeKey("wallets",e=>this.wallets=e))}firstUpdated(){this.initialFetch(),this.createPaginationObserver()}disconnectedCallback(){var e;this.unsubscribe.forEach(t=>t()),(e=this.paginationObserver)==null||e.disconnect()}render(){return this.mobileFullScreen&&this.setAttribute("data-mobile-fullscreen","true"),c`
      <wui-grid
        data-scroll=${!this.loading}
        .padding=${["0","3","3","3"]}
        gap="2"
        justifyContent="space-between"
      >
        ${this.loading?this.shimmerTemplate(16):this.walletsTemplate()}
        ${this.paginationLoaderTemplate()}
      </wui-grid>
    `}async initialFetch(){var t;this.loading=!0;const e=(t=this.shadowRoot)==null?void 0:t.querySelector("wui-grid");e&&(await z.fetchWalletsByPage({page:1}),await e.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.loading=!1,e.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"}))}shimmerTemplate(e,t){return[...Array(e)].map(()=>c`
        <wui-card-select-loader type="wallet" id=${M(t)}></wui-card-select-loader>
      `)}walletsTemplate(){return rt.getWalletConnectWallets(this.wallets).map((e,t)=>c`
        <w3m-all-wallets-list-item
          data-testid="wallet-search-item-${e.id}"
          @click=${()=>this.onConnectWallet(e)}
          .wallet=${e}
          explorerId=${e.id}
          certified=${this.badge==="certified"}
          displayIndex=${t}
        ></w3m-all-wallets-list-item>
      `)}paginationLoaderTemplate(){const{wallets:e,recommended:t,featured:n,count:o,mobileFilteredOutWalletsLength:r}=z.state,i=window.innerWidth<352?3:4,s=e.length+t.length;let a=Math.ceil(s/i)*i-s+i;return a-=e.length?n.length%i:0,o===0&&n.length>0?null:o===0||[...n,...e,...t].length<o-(r!=null?r:0)?this.shimmerTemplate(a,_n):null}createPaginationObserver(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(`#${_n}`);e&&(this.paginationObserver=new IntersectionObserver(([n])=>{if(n!=null&&n.isIntersecting&&!this.loading){const{page:o,count:r,wallets:i}=z.state;i.length<r&&z.fetchWalletsByPage({page:o+1})}}),this.paginationObserver.observe(e))}onConnectWallet(e){G.selectWalletConnector(e)}};xe.styles=to,We([P()],xe.prototype,"loading",void 0),We([P()],xe.prototype,"wallets",void 0),We([P()],xe.prototype,"badge",void 0),We([P()],xe.prototype,"mobileFullScreen",void 0),xe=We([N("w3m-all-wallets-list")],xe);const no=jt`
  wui-grid,
  wui-loading-spinner,
  wui-flex {
    height: 360px;
  }

  wui-grid {
    overflow: scroll;
    scrollbar-width: none;
    grid-auto-rows: min-content;
    grid-template-columns: repeat(auto-fill, 104px);
  }

  :host([data-mobile-fullscreen='true']) wui-grid {
    max-height: none;
    height: auto;
  }

  wui-grid[data-scroll='false'] {
    overflow: hidden;
  }

  wui-grid::-webkit-scrollbar {
    display: none;
  }

  wui-loading-spinner {
    justify-content: center;
    align-items: center;
  }

  @media (max-width: 350px) {
    wui-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
`;var Me=function(e,t,n,o){var r=arguments.length,i=r<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,n):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(r<3?s(i):r>3?s(t,n,i):s(t,n))||i);return r>3&&i&&Object.defineProperty(t,n,i),i};let $e=class extends W{constructor(){super(...arguments),this.prevQuery="",this.prevBadge=void 0,this.loading=!0,this.mobileFullScreen=F.state.enableMobileFullScreen,this.query=""}render(){return this.mobileFullScreen&&this.setAttribute("data-mobile-fullscreen","true"),this.onSearch(),this.loading?c`<wui-loading-spinner color="accent-primary"></wui-loading-spinner>`:this.walletsTemplate()}async onSearch(){(this.query.trim()!==this.prevQuery.trim()||this.badge!==this.prevBadge)&&(this.prevQuery=this.query,this.prevBadge=this.badge,this.loading=!0,await z.searchWallet({search:this.query,badge:this.badge}),this.loading=!1)}walletsTemplate(){const{search:e}=z.state,t=rt.markWalletsAsInstalled(e),n=rt.filterWalletsByWcSupport(t);return n.length?c`
      <wui-grid
        data-testid="wallet-list"
        .padding=${["0","3","3","3"]}
        rowGap="4"
        columngap="2"
        justifyContent="space-between"
      >
        ${n.map((o,r)=>c`
            <w3m-all-wallets-list-item
              @click=${()=>this.onConnectWallet(o)}
              .wallet=${o}
              data-testid="wallet-search-item-${o.id}"
              explorerId=${o.id}
              certified=${this.badge==="certified"}
              walletQuery=${this.query}
              displayIndex=${r}
            ></w3m-all-wallets-list-item>
          `)}
      </wui-grid>
    `:c`
        <wui-flex
          data-testid="no-wallet-found"
          justifyContent="center"
          alignItems="center"
          gap="3"
          flexDirection="column"
        >
          <wui-icon-box size="lg" color="default" icon="wallet"></wui-icon-box>
          <wui-text data-testid="no-wallet-found-text" color="secondary" variant="md-medium">
            No Wallet found
          </wui-text>
        </wui-flex>
      `}onConnectWallet(e){G.selectWalletConnector(e)}};$e.styles=no,Me([P()],$e.prototype,"loading",void 0),Me([P()],$e.prototype,"mobileFullScreen",void 0),Me([p()],$e.prototype,"query",void 0),Me([p()],$e.prototype,"badge",void 0),$e=Me([N("w3m-all-wallets-search")],$e);var Et=function(e,t,n,o){var r=arguments.length,i=r<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,n):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(r<3?s(i):r>3?s(t,n,i):s(t,n))||i);return r>3&&i&&Object.defineProperty(t,n,i),i};let ze=class extends W{constructor(){super(...arguments),this.search="",this.badge=void 0,this.onDebouncedSearch=j.debounce(e=>{this.search=e})}render(){const e=this.search.length>=2;return c`
      <wui-flex .padding=${["1","3","3","3"]} gap="2" alignItems="center">
        <wui-search-bar @inputChange=${this.onInputChange.bind(this)}></wui-search-bar>
        <wui-certified-switch
          ?checked=${this.badge==="certified"}
          @certifiedSwitchChange=${this.onCertifiedSwitchChange.bind(this)}
          data-testid="wui-certified-switch"
        ></wui-certified-switch>
        ${this.qrButtonTemplate()}
      </wui-flex>
      ${e||this.badge?c`<w3m-all-wallets-search
            query=${this.search}
            .badge=${this.badge}
          ></w3m-all-wallets-search>`:c`<w3m-all-wallets-list .badge=${this.badge}></w3m-all-wallets-list>`}
    `}onInputChange(e){this.onDebouncedSearch(e.detail)}onCertifiedSwitchChange(e){e.detail?(this.badge="certified",Se.showSvg("Only WalletConnect certified",{icon:"walletConnectBrown",iconColor:"accent-100"})):this.badge=void 0}qrButtonTemplate(){return j.isMobile()?c`
        <wui-icon-box
          size="xl"
          iconSize="xl"
          color="accent-primary"
          icon="qrCode"
          border
          borderColor="wui-accent-glass-010"
          @click=${this.onWalletConnectQr.bind(this)}
        ></wui-icon-box>
      `:null}onWalletConnectQr(){L.push("ConnectingWalletConnect")}};Et([P()],ze.prototype,"search",void 0),Et([P()],ze.prototype,"badge",void 0),ze=Et([N("w3m-all-wallets-view")],ze);var io=function(e,t,n,o){var r=arguments.length,i=r<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,n):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(r<3?s(i):r>3?s(t,n,i):s(t,n))||i);return r>3&&i&&Object.defineProperty(t,n,i),i};let Rt=class extends W{constructor(){var e;super(...arguments),this.wallet=(e=L.state.data)==null?void 0:e.wallet}render(){if(!this.wallet)throw new Error("w3m-downloads-view");return c`
      <wui-flex gap="2" flexDirection="column" .padding=${["3","3","4","3"]}>
        ${this.chromeTemplate()} ${this.iosTemplate()} ${this.androidTemplate()}
        ${this.homepageTemplate()}
      </wui-flex>
    `}chromeTemplate(){var e;return(e=this.wallet)!=null&&e.chrome_store?c`<wui-list-item
      variant="icon"
      icon="chromeStore"
      iconVariant="square"
      @click=${this.onChromeStore.bind(this)}
      chevron
    >
      <wui-text variant="md-medium" color="primary">Chrome Extension</wui-text>
    </wui-list-item>`:null}iosTemplate(){var e;return(e=this.wallet)!=null&&e.app_store?c`<wui-list-item
      variant="icon"
      icon="appStore"
      iconVariant="square"
      @click=${this.onAppStore.bind(this)}
      chevron
    >
      <wui-text variant="md-medium" color="primary">iOS App</wui-text>
    </wui-list-item>`:null}androidTemplate(){var e;return(e=this.wallet)!=null&&e.play_store?c`<wui-list-item
      variant="icon"
      icon="playStore"
      iconVariant="square"
      @click=${this.onPlayStore.bind(this)}
      chevron
    >
      <wui-text variant="md-medium" color="primary">Android App</wui-text>
    </wui-list-item>`:null}homepageTemplate(){var e;return(e=this.wallet)!=null&&e.homepage?c`
      <wui-list-item
        variant="icon"
        icon="browser"
        iconVariant="square-blue"
        @click=${this.onHomePage.bind(this)}
        chevron
      >
        <wui-text variant="md-medium" color="primary">Website</wui-text>
      </wui-list-item>
    `:null}openStore(e){e.href&&this.wallet&&(H.sendEvent({type:"track",event:"GET_WALLET",properties:{name:this.wallet.name,walletRank:this.wallet.order,explorerId:this.wallet.id,type:e.type}}),j.openHref(e.href,"_blank"))}onChromeStore(){var e;(e=this.wallet)!=null&&e.chrome_store&&this.openStore({href:this.wallet.chrome_store,type:"chrome_store"})}onAppStore(){var e;(e=this.wallet)!=null&&e.app_store&&this.openStore({href:this.wallet.app_store,type:"app_store"})}onPlayStore(){var e;(e=this.wallet)!=null&&e.play_store&&this.openStore({href:this.wallet.play_store,type:"play_store"})}onHomePage(){var e;(e=this.wallet)!=null&&e.homepage&&this.openStore({href:this.wallet.homepage,type:"homepage"})}};Rt=io([N("w3m-downloads-view")],Rt);export{ze as W3mAllWalletsView,Ne as W3mConnectingWcBasicView,Rt as W3mDownloadsView};
