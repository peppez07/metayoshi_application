import{i as S,C as V,A as L,O as N,a as I,b as E,c as st,d as c,E as z,R as $,e as B,f as Pt,g as wn,h as ie,H as mn,j as Z,r as q,k as le,T as ze,S as Re,M as Lt,l as Bt,m as Ot,n as bn,o as Nt,w as _e,p as yn,q as vn,s as jt,t as Wt,W as at}from"./core-TcZz-NFB.js";import{n as h,r as v,c as R,o as P,U as ee,i as xn,t as $n,e as Cn,a as kn}from"./index-CZ-mf6pn.js";import{d as En}from"./bootstrap-DJ6yFucQ.js";import"./ui.js";import"./index-Dwok1gNp.js";import"./networkCapabilities-DIq6CJoC.js";var we=function(e,t,n,r){var o=arguments.length,i=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(o<3?s(i):o>3?s(t,n,i):s(t,n))||i);return o>3&&i&&Object.defineProperty(t,n,i),i};let ce=class extends S{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=V.state.connectors,this.count=L.state.count,this.filteredCount=L.state.filteredWallets.length,this.isFetchingRecommendedWallets=L.state.isFetchingRecommendedWallets,this.unsubscribe.push(V.subscribeKey("connectors",e=>this.connectors=e),L.subscribeKey("count",e=>this.count=e),L.subscribeKey("filteredWallets",e=>this.filteredCount=e.length),L.subscribeKey("isFetchingRecommendedWallets",e=>this.isFetchingRecommendedWallets=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){const e=this.connectors.find(l=>l.id==="walletConnect"),{allWallets:t}=N.state;if(!e||t==="HIDE"||t==="ONLY_MOBILE"&&!I.isMobile())return null;const n=L.state.featured.length,r=this.count+n,o=r<10?r:Math.floor(r/10)*10,i=this.filteredCount>0?this.filteredCount:o;let s=`${i}`;this.filteredCount>0?s=`${this.filteredCount}`:i<r&&(s=`${i}+`);const a=E.hasAnyConnection(st.CONNECTOR_ID.WALLET_CONNECT);return c`
      <wui-list-wallet
        name="Search Wallet"
        walletIcon="search"
        showAllWallets
        @click=${this.onAllWallets.bind(this)}
        tagLabel=${s}
        tagVariant="info"
        data-testid="all-wallets"
        tabIdx=${P(this.tabIdx)}
        .loading=${this.isFetchingRecommendedWallets}
        ?disabled=${a}
        size="sm"
      ></wui-list-wallet>
    `}onAllWallets(){var e;z.sendEvent({type:"track",event:"CLICK_ALL_WALLETS"}),$.push("AllWallets",{redirectView:(e=$.state.data)==null?void 0:e.redirectView})}};we([h()],ce.prototype,"tabIdx",void 0),we([v()],ce.prototype,"connectors",void 0),we([v()],ce.prototype,"count",void 0),we([v()],ce.prototype,"filteredCount",void 0),we([v()],ce.prototype,"isFetchingRecommendedWallets",void 0),ce=we([R("w3m-all-wallets-widget")],ce);const Rn=B`
  :host {
    margin-top: ${({spacing:e})=>e[1]};
  }
  wui-separator {
    margin: ${({spacing:e})=>e[3]} calc(${({spacing:e})=>e[3]} * -1)
      ${({spacing:e})=>e[2]} calc(${({spacing:e})=>e[3]} * -1);
    width: calc(100% + ${({spacing:e})=>e[3]} * 2);
  }
`;var me=function(e,t,n,r){var o=arguments.length,i=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(o<3?s(i):o>3?s(t,n,i):s(t,n))||i);return o>3&&i&&Object.defineProperty(t,n,i),i};let re=class extends S{constructor(){super(),this.unsubscribe=[],this.explorerWallets=L.state.explorerWallets,this.connections=E.state.connections,this.connectorImages=Pt.state.connectorImages,this.loadingTelegram=!1,this.unsubscribe.push(E.subscribeKey("connections",e=>this.connections=e),Pt.subscribeKey("connectorImages",e=>this.connectorImages=e),L.subscribeKey("explorerFilteredWallets",e=>{this.explorerWallets=e!=null&&e.length?e:L.state.explorerWallets}),L.subscribeKey("explorerWallets",e=>{var t;(t=this.explorerWallets)!=null&&t.length||(this.explorerWallets=e)})),I.isTelegram()&&I.isIos()&&(this.loadingTelegram=!E.state.wcUri,this.unsubscribe.push(E.subscribeKey("wcUri",e=>this.loadingTelegram=!e)))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return c`
      <wui-flex flexDirection="column" gap="2"> ${this.connectorListTemplate()} </wui-flex>
    `}connectorListTemplate(){return wn.connectorList().map((e,t)=>e.kind==="connector"?this.renderConnector(e,t):this.renderWallet(e,t))}getConnectorNamespaces(e){var t;return e.subtype==="walletConnect"?[]:e.subtype==="multiChain"?((t=e.connector.connectors)==null?void 0:t.map(n=>n.chain))||[]:[e.connector.chain]}renderConnector(e,t){var u,y,C,g,x;const n=e.connector,r=ie.getConnectorImage(n)||this.connectorImages[(u=n==null?void 0:n.imageId)!=null?u:""],o=((y=this.connections.get(n.chain))!=null?y:[]).some(f=>mn.isLowerCaseMatch(f.connectorId,n.id));let i,s;e.subtype==="walletConnect"?(i="qr code",s="accent"):e.subtype==="injected"||e.subtype==="announced"?(i=o?"connected":"installed",s=o?"info":"success"):(i=void 0,s=void 0);const a=E.hasAnyConnection(st.CONNECTOR_ID.WALLET_CONNECT),l=e.subtype==="walletConnect"||e.subtype==="external"?a:!1;return c`
      <w3m-list-wallet
        displayIndex=${t}
        imageSrc=${P(r)}
        .installed=${!0}
        name=${(C=n.name)!=null?C:"Unknown"}
        .tagVariant=${s}
        tagLabel=${P(i)}
        data-testid=${`wallet-selector-${n.id.toLowerCase()}`}
        size="sm"
        @click=${()=>this.onClickConnector(e)}
        tabIdx=${P(this.tabIdx)}
        ?disabled=${l}
        rdnsId=${P(((g=n.explorerWallet)==null?void 0:g.rdns)||void 0)}
        walletRank=${P((x=n.explorerWallet)==null?void 0:x.order)}
        .namespaces=${this.getConnectorNamespaces(e)}
      >
      </w3m-list-wallet>
    `}onClickConnector(e){var n;const t=(n=$.state.data)==null?void 0:n.redirectView;if(e.subtype==="walletConnect"){V.setActiveConnector(e.connector),I.isMobile()?$.push("AllWallets"):$.push("ConnectingWalletConnect",{redirectView:t});return}if(e.subtype==="multiChain"){V.setActiveConnector(e.connector),$.push("ConnectingMultiChain",{redirectView:t});return}if(e.subtype==="injected"){V.setActiveConnector(e.connector),$.push("ConnectingExternal",{connector:e.connector,redirectView:t,wallet:e.connector.explorerWallet});return}if(e.subtype==="announced"){if(e.connector.id==="walletConnect"){I.isMobile()?$.push("AllWallets"):$.push("ConnectingWalletConnect",{redirectView:t});return}$.push("ConnectingExternal",{connector:e.connector,redirectView:t,wallet:e.connector.explorerWallet});return}$.push("ConnectingExternal",{connector:e.connector,redirectView:t})}renderWallet(e,t){var l;const n=e.wallet,r=ie.getWalletImage(n),o=E.hasAnyConnection(st.CONNECTOR_ID.WALLET_CONNECT),i=this.loadingTelegram,s=e.subtype==="recent"?"recent":void 0,a=e.subtype==="recent"?"info":void 0;return c`
      <w3m-list-wallet
        displayIndex=${t}
        imageSrc=${P(r)}
        name=${(l=n.name)!=null?l:"Unknown"}
        @click=${()=>this.onClickWallet(e)}
        size="sm"
        data-testid=${`wallet-selector-${n.id}`}
        tabIdx=${P(this.tabIdx)}
        ?loading=${i}
        ?disabled=${o}
        rdnsId=${P(n.rdns||void 0)}
        walletRank=${P(n.order)}
        tagLabel=${P(s)}
        .tagVariant=${a}
      >
      </w3m-list-wallet>
    `}onClickWallet(e){var o;const t=(o=$.state.data)==null?void 0:o.redirectView,n=Z.state.activeChain;if(e.subtype==="featured"){V.selectWalletConnector(e.wallet);return}if(e.subtype==="recent"){if(this.loadingTelegram)return;V.selectWalletConnector(e.wallet);return}if(e.subtype==="custom"){if(this.loadingTelegram)return;$.push("ConnectingWalletConnect",{wallet:e.wallet,redirectView:t});return}if(this.loadingTelegram)return;const r=n?V.getConnector({id:e.wallet.id,namespace:n}):void 0;r?$.push("ConnectingExternal",{connector:r,redirectView:t}):$.push("ConnectingWalletConnect",{wallet:e.wallet,redirectView:t})}};re.styles=Rn,me([h({type:Number})],re.prototype,"tabIdx",void 0),me([v()],re.prototype,"explorerWallets",void 0),me([v()],re.prototype,"connections",void 0),me([v()],re.prototype,"connectorImages",void 0),me([v()],re.prototype,"loadingTelegram",void 0),re=me([R("w3m-connector-list")],re);const Tn=B`
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
`;var Te=function(e,t,n,r){var o=arguments.length,i=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(o<3?s(i):o>3?s(t,n,i):s(t,n))||i);return o>3&&i&&Object.defineProperty(t,n,i),i};const An={lg:"lg-regular",md:"md-regular",sm:"sm-regular"},In={lg:"md",md:"sm",sm:"sm"};let de=class extends S{constructor(){super(...arguments),this.icon="mobile",this.size="md",this.label="",this.active=!1}render(){return c`
      <button data-active=${this.active}>
        ${this.icon?c`<wui-icon size=${In[this.size]} name=${this.icon}></wui-icon>`:""}
        <wui-text variant=${An[this.size]}> ${this.label} </wui-text>
      </button>
    `}};de.styles=[q,le,Tn],Te([h()],de.prototype,"icon",void 0),Te([h()],de.prototype,"size",void 0),Te([h()],de.prototype,"label",void 0),Te([h({type:Boolean})],de.prototype,"active",void 0),de=Te([R("wui-tab-item")],de);const Sn=B`
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
`;var Ae=function(e,t,n,r){var o=arguments.length,i=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(o<3?s(i):o>3?s(t,n,i):s(t,n))||i);return o>3&&i&&Object.defineProperty(t,n,i),i};let ue=class extends S{constructor(){super(...arguments),this.tabs=[],this.onTabChange=()=>null,this.size="md",this.activeTab=0}render(){return this.dataset.size=this.size,this.tabs.map((e,t)=>{var r;const n=t===this.activeTab;return c`
        <wui-tab-item
          @click=${()=>this.onTabClick(t)}
          icon=${e.icon}
          size=${this.size}
          label=${e.label}
          ?active=${n}
          data-active=${n}
          data-testid="tab-${(r=e.label)==null?void 0:r.toLowerCase()}"
        ></wui-tab-item>
      `})}onTabClick(e){this.activeTab=e,this.onTabChange(e)}};ue.styles=[q,le,Sn],Ae([h({type:Array})],ue.prototype,"tabs",void 0),Ae([h()],ue.prototype,"onTabChange",void 0),Ae([h()],ue.prototype,"size",void 0),Ae([v()],ue.prototype,"activeTab",void 0),ue=Ae([R("wui-tabs")],ue);var lt=function(e,t,n,r){var o=arguments.length,i=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(o<3?s(i):o>3?s(t,n,i):s(t,n))||i);return o>3&&i&&Object.defineProperty(t,n,i),i};let De=class extends S{constructor(){super(...arguments),this.platformTabs=[],this.unsubscribe=[],this.platforms=[],this.onSelectPlatfrom=void 0}disconnectCallback(){this.unsubscribe.forEach(e=>e())}render(){const e=this.generateTabs();return c`
      <wui-flex justifyContent="center" .padding=${["0","0","4","0"]}>
        <wui-tabs .tabs=${e} .onTabChange=${this.onTabChange.bind(this)}></wui-tabs>
      </wui-flex>
    `}generateTabs(){const e=this.platforms.map(t=>t==="browser"?{label:"Browser",icon:"extension",platform:"browser"}:t==="mobile"?{label:"Mobile",icon:"mobile",platform:"mobile"}:t==="qrcode"?{label:"Mobile",icon:"mobile",platform:"qrcode"}:t==="web"?{label:"Webapp",icon:"browser",platform:"web"}:t==="desktop"?{label:"Desktop",icon:"desktop",platform:"desktop"}:{label:"Browser",icon:"extension",platform:"unsupported"});return this.platformTabs=e.map(({platform:t})=>t),e}onTabChange(e){var n;const t=this.platformTabs[e];t&&((n=this.onSelectPlatfrom)==null||n.call(this,t))}};lt([h({type:Array})],De.prototype,"platforms",void 0),lt([h()],De.prototype,"onSelectPlatfrom",void 0),De=lt([R("w3m-connecting-header")],De);const Pn=B`
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
`;var Mt=function(e,t,n,r){var o=arguments.length,i=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(o<3?s(i):o>3?s(t,n,i):s(t,n))||i);return o>3&&i&&Object.defineProperty(t,n,i),i};let Ue=class extends S{constructor(){super(...arguments),this.radius=36}render(){return this.svgLoaderTemplate()}svgLoaderTemplate(){const e=this.radius>50?50:this.radius,t=36-e,n=116+t,r=245+t,o=360+t*1.75;return c`
      <svg viewBox="0 0 110 110" width="110" height="110">
        <rect
          x="2"
          y="2"
          width="106"
          height="106"
          rx=${e}
          stroke-dasharray="${n} ${r}"
          stroke-dashoffset=${o}
        />
      </svg>
    `}};Ue.styles=[q,Pn],Mt([h({type:Number})],Ue.prototype,"radius",void 0),Ue=Mt([R("wui-loading-thumbnail")],Ue);const Ln=B`
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
`;var Fe=function(e,t,n,r){var o=arguments.length,i=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(o<3?s(i):o>3?s(t,n,i):s(t,n))||i);return o>3&&i&&Object.defineProperty(t,n,i),i};let be=class extends S{constructor(){super(...arguments),this.disabled=!1,this.label="",this.buttonLabel=""}render(){return c`
      <wui-flex justifyContent="space-between" alignItems="center">
        <wui-text variant="lg-regular" color="inherit">${this.label}</wui-text>
        <wui-button variant="accent-secondary" size="sm">
          ${this.buttonLabel}
          <wui-icon name="chevronRight" color="inherit" size="inherit" slot="iconRight"></wui-icon>
        </wui-button>
      </wui-flex>
    `}};be.styles=[q,le,Ln],Fe([h({type:Boolean})],be.prototype,"disabled",void 0),Fe([h()],be.prototype,"label",void 0),Fe([h()],be.prototype,"buttonLabel",void 0),be=Fe([R("wui-cta-button")],be);const Bn=B`
  :host {
    display: block;
    padding: 0 ${({spacing:e})=>e[5]} ${({spacing:e})=>e[5]};
  }
`;var zt=function(e,t,n,r){var o=arguments.length,i=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(o<3?s(i):o>3?s(t,n,i):s(t,n))||i);return o>3&&i&&Object.defineProperty(t,n,i),i};let Ve=class extends S{constructor(){super(...arguments),this.wallet=void 0}render(){if(!this.wallet)return this.style.display="none",null;const{name:e,app_store:t,play_store:n,chrome_store:r,homepage:o}=this.wallet,i=I.isMobile(),s=I.isIos(),a=I.isAndroid(),l=[t,n,o,r].filter(Boolean).length>1,u=ee.getTruncateString({string:e,charsStart:12,charsEnd:0,truncate:"end"});return l&&!i?c`
        <wui-cta-button
          label=${`Don't have ${u}?`}
          buttonLabel="Get"
          @click=${()=>$.push("Downloads",{wallet:this.wallet})}
        ></wui-cta-button>
      `:!l&&o?c`
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
      `:(this.style.display="none",null)}onAppStore(){var e;(e=this.wallet)!=null&&e.app_store&&I.openHref(this.wallet.app_store,"_blank")}onPlayStore(){var e;(e=this.wallet)!=null&&e.play_store&&I.openHref(this.wallet.play_store,"_blank")}onHomePage(){var e;(e=this.wallet)!=null&&e.homepage&&I.openHref(this.wallet.homepage,"_blank")}};Ve.styles=[Bn],zt([h({type:Object})],Ve.prototype,"wallet",void 0),Ve=zt([R("w3m-mobile-download-links")],Ve);const On=B`
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
`;var H=function(e,t,n,r){var o=arguments.length,i=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(o<3?s(i):o>3?s(t,n,i):s(t,n))||i);return o>3&&i&&Object.defineProperty(t,n,i),i};class O extends S{constructor(){var t,n,r,o,i,s,a,l;super(),this.wallet=(t=$.state.data)==null?void 0:t.wallet,this.connector=(n=$.state.data)==null?void 0:n.connector,this.timeout=void 0,this.secondaryBtnIcon="refresh",this.onConnect=void 0,this.onRender=void 0,this.onAutoConnect=void 0,this.isWalletConnect=!0,this.unsubscribe=[],this.imageSrc=(r=ie.getConnectorImage(this.connector))!=null?r:ie.getWalletImage(this.wallet),this.name=(a=(s=(o=this.wallet)==null?void 0:o.name)!=null?s:(i=this.connector)==null?void 0:i.name)!=null?a:"Wallet",this.isRetrying=!1,this.uri=E.state.wcUri,this.error=E.state.wcError,this.ready=!1,this.showRetry=!1,this.label=void 0,this.secondaryBtnLabel="Try again",this.secondaryLabel="Accept connection request in the wallet",this.isLoading=!1,this.isMobile=!1,this.onRetry=void 0,this.unsubscribe.push(E.subscribeKey("wcUri",u=>{var y;this.uri=u,this.isRetrying&&this.onRetry&&(this.isRetrying=!1,(y=this.onConnect)==null||y.call(this))}),E.subscribeKey("wcError",u=>this.error=u)),(I.isTelegram()||I.isSafari())&&I.isIos()&&E.state.wcUri&&((l=this.onConnect)==null||l.call(this))}firstUpdated(){var t;(t=this.onAutoConnect)==null||t.call(this),this.showRetry=!this.onAutoConnect}disconnectedCallback(){this.unsubscribe.forEach(t=>t()),E.setWcError(!1),clearTimeout(this.timeout)}render(){var r;(r=this.onRender)==null||r.call(this),this.onShowRetry();const t=this.error?"Connection can be declined if a previous request is still active":this.secondaryLabel;let n="";return this.label?n=this.label:(n=`Continue in ${this.name}`,this.error&&(n="Connection declined")),c`
      <wui-flex
        data-error=${P(this.error)}
        data-retry=${this.showRetry}
        flexDirection="column"
        alignItems="center"
        .padding=${["10","5","5","5"]}
        gap="6"
      >
        <wui-flex gap="2" justifyContent="center" alignItems="center">
          <wui-wallet-image size="lg" imageSrc=${P(this.imageSrc)}></wui-wallet-image>

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
    `}onShowRetry(){var t,n;this.error&&!this.showRetry&&(this.showRetry=!0,(n=(t=this.shadowRoot)==null?void 0:t.querySelector("wui-button"))==null||n.animate([{opacity:0},{opacity:1}],{fill:"forwards",easing:"ease"}))}onTryAgain(){var t,n;E.setWcError(!1),this.onRetry?(this.isRetrying=!0,(t=this.onRetry)==null||t.call(this)):(n=this.onConnect)==null||n.call(this)}loaderTemplate(){const t=ze.state.themeVariables["--w3m-border-radius-master"],n=t?parseInt(t.replace("px",""),10):4;return c`<wui-loading-thumbnail radius=${n*9}></wui-loading-thumbnail>`}onCopyUri(){try{this.uri&&(I.copyToClopboard(this.uri),Re.showSuccess("Link copied"))}catch{Re.showError("Failed to copy")}}}O.styles=On,H([v()],O.prototype,"isRetrying",void 0),H([v()],O.prototype,"uri",void 0),H([v()],O.prototype,"error",void 0),H([v()],O.prototype,"ready",void 0),H([v()],O.prototype,"showRetry",void 0),H([v()],O.prototype,"label",void 0),H([v()],O.prototype,"secondaryBtnLabel",void 0),H([v()],O.prototype,"secondaryLabel",void 0),H([v()],O.prototype,"isLoading",void 0),H([h({type:Boolean})],O.prototype,"isMobile",void 0),H([h()],O.prototype,"onRetry",void 0);var Nn=function(e,t,n,r){var o=arguments.length,i=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(o<3?s(i):o>3?s(t,n,i):s(t,n))||i);return o>3&&i&&Object.defineProperty(t,n,i),i};let _t=class extends O{constructor(){var e;if(super(),!this.wallet)throw new Error("w3m-connecting-wc-browser: No wallet provided");this.onConnect=this.onConnectProxy.bind(this),this.onAutoConnect=this.onConnectProxy.bind(this),z.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"browser",displayIndex:(e=this.wallet)==null?void 0:e.display_index,walletRank:this.wallet.order,view:$.state.view}})}async onConnectProxy(){var e;try{this.error=!1;const{connectors:t}=V.state,n=t.find(r=>{var o,i,s;return r.type==="ANNOUNCED"&&((o=r.info)==null?void 0:o.rdns)===((i=this.wallet)==null?void 0:i.rdns)||r.type==="INJECTED"||r.name===((s=this.wallet)==null?void 0:s.name)});if(n)await E.connectExternal(n,n.chain);else throw new Error("w3m-connecting-wc-browser: No connector found");Lt.close()}catch(t){t instanceof Bt&&t.originalName===Ot.PROVIDER_RPC_ERROR_NAME.USER_REJECTED_REQUEST?z.sendEvent({type:"track",event:"USER_REJECTED",properties:{message:t.message}}):z.sendEvent({type:"track",event:"CONNECT_ERROR",properties:{message:(e=t==null?void 0:t.message)!=null?e:"Unknown"}}),this.error=!0}}};_t=Nn([R("w3m-connecting-wc-browser")],_t);var jn=function(e,t,n,r){var o=arguments.length,i=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(o<3?s(i):o>3?s(t,n,i):s(t,n))||i);return o>3&&i&&Object.defineProperty(t,n,i),i};let Dt=class extends O{constructor(){var e;if(super(),!this.wallet)throw new Error("w3m-connecting-wc-desktop: No wallet provided");this.onConnect=this.onConnectProxy.bind(this),this.onRender=this.onRenderProxy.bind(this),z.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"desktop",displayIndex:(e=this.wallet)==null?void 0:e.display_index,walletRank:this.wallet.order,view:$.state.view}})}onRenderProxy(){var e;!this.ready&&this.uri&&(this.ready=!0,(e=this.onConnect)==null||e.call(this))}onConnectProxy(){var e;if((e=this.wallet)!=null&&e.desktop_link&&this.uri)try{this.error=!1;const{desktop_link:t,name:n}=this.wallet,{redirect:r,href:o}=I.formatNativeUrl(t,this.uri);E.setWcLinking({name:n,href:o}),E.setRecentWallet(this.wallet),I.openHref(r,"_blank")}catch{this.error=!0}}};Dt=jn([R("w3m-connecting-wc-desktop")],Dt);var ye=function(e,t,n,r){var o=arguments.length,i=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(o<3?s(i):o>3?s(t,n,i):s(t,n))||i);return o>3&&i&&Object.defineProperty(t,n,i),i};let he=class extends O{constructor(){var e;if(super(),this.btnLabelTimeout=void 0,this.redirectDeeplink=void 0,this.redirectUniversalLink=void 0,this.target=void 0,this.preferUniversalLinks=N.state.experimental_preferUniversalLinks,this.isLoading=!0,this.onConnect=()=>{bn.onConnectMobile(this.wallet)},!this.wallet)throw new Error("w3m-connecting-wc-mobile: No wallet provided");this.secondaryBtnLabel="Open",this.secondaryLabel=Nt.CONNECT_LABELS.MOBILE,this.secondaryBtnIcon="externalLink",this.onHandleURI(),this.unsubscribe.push(E.subscribeKey("wcUri",()=>{this.onHandleURI()})),z.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"mobile",displayIndex:(e=this.wallet)==null?void 0:e.display_index,walletRank:this.wallet.order,view:$.state.view}})}disconnectedCallback(){super.disconnectedCallback(),clearTimeout(this.btnLabelTimeout)}onHandleURI(){var e;this.isLoading=!this.uri,!this.ready&&this.uri&&(this.ready=!0,(e=this.onConnect)==null||e.call(this))}onTryAgain(){var e;E.setWcError(!1),(e=this.onConnect)==null||e.call(this)}};ye([v()],he.prototype,"redirectDeeplink",void 0),ye([v()],he.prototype,"redirectUniversalLink",void 0),ye([v()],he.prototype,"target",void 0),ye([v()],he.prototype,"preferUniversalLinks",void 0),ye([v()],he.prototype,"isLoading",void 0),he=ye([R("w3m-connecting-wc-mobile")],he);var Ie={},Wn=function(){return typeof Promise=="function"&&Promise.prototype&&Promise.prototype.then},Ut={},_={};let ct;const Mn=[0,26,44,70,100,134,172,196,242,292,346,404,466,532,581,655,733,815,901,991,1085,1156,1258,1364,1474,1588,1706,1828,1921,2051,2185,2323,2465,2611,2761,2876,3034,3196,3362,3532,3706];_.getSymbolSize=function(e){if(!e)throw new Error('"version" cannot be null or undefined');if(e<1||e>40)throw new Error('"version" should be in range from 1 to 40');return e*4+17},_.getSymbolTotalCodewords=function(e){return Mn[e]},_.getBCHDigit=function(e){let t=0;for(;e!==0;)t++,e>>>=1;return t},_.setToSJISFunction=function(e){if(typeof e!="function")throw new Error('"toSJISFunc" is not a valid function.');ct=e},_.isKanjiModeEnabled=function(){return typeof ct<"u"},_.toSJIS=function(e){return ct(e)};var qe={};(function(e){e.L={bit:1},e.M={bit:0},e.Q={bit:3},e.H={bit:2};function t(n){if(typeof n!="string")throw new Error("Param is not a string");switch(n.toLowerCase()){case"l":case"low":return e.L;case"m":case"medium":return e.M;case"q":case"quartile":return e.Q;case"h":case"high":return e.H;default:throw new Error("Unknown EC Level: "+n)}}e.isValid=function(n){return n&&typeof n.bit<"u"&&n.bit>=0&&n.bit<4},e.from=function(n,r){if(e.isValid(n))return n;try{return t(n)}catch{return r}}})(qe);function Ft(){this.buffer=[],this.length=0}Ft.prototype={get:function(e){const t=Math.floor(e/8);return(this.buffer[t]>>>7-e%8&1)===1},put:function(e,t){for(let n=0;n<t;n++)this.putBit((e>>>t-n-1&1)===1)},getLengthInBits:function(){return this.length},putBit:function(e){const t=Math.floor(this.length/8);this.buffer.length<=t&&this.buffer.push(0),e&&(this.buffer[t]|=128>>>this.length%8),this.length++}};var zn=Ft;function Se(e){if(!e||e<1)throw new Error("BitMatrix size must be defined and greater than 0");this.size=e,this.data=new Uint8Array(e*e),this.reservedBit=new Uint8Array(e*e)}Se.prototype.set=function(e,t,n,r){const o=e*this.size+t;this.data[o]=n,r&&(this.reservedBit[o]=!0)},Se.prototype.get=function(e,t){return this.data[e*this.size+t]},Se.prototype.xor=function(e,t,n){this.data[e*this.size+t]^=n},Se.prototype.isReserved=function(e,t){return this.reservedBit[e*this.size+t]};var _n=Se,Vt={};(function(e){const t=_.getSymbolSize;e.getRowColCoords=function(n){if(n===1)return[];const r=Math.floor(n/7)+2,o=t(n),i=o===145?26:Math.ceil((o-13)/(2*r-2))*2,s=[o-7];for(let a=1;a<r-1;a++)s[a]=s[a-1]-i;return s.push(6),s.reverse()},e.getPositions=function(n){const r=[],o=e.getRowColCoords(n),i=o.length;for(let s=0;s<i;s++)for(let a=0;a<i;a++)s===0&&a===0||s===0&&a===i-1||s===i-1&&a===0||r.push([o[s],o[a]]);return r}})(Vt);var qt={};const Dn=_.getSymbolSize,Ht=7;qt.getPositions=function(e){const t=Dn(e);return[[0,0],[t-Ht,0],[0,t-Ht]]};var Kt={};(function(e){e.Patterns={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7};const t={N1:3,N2:3,N3:40,N4:10};e.isValid=function(r){return r!=null&&r!==""&&!isNaN(r)&&r>=0&&r<=7},e.from=function(r){return e.isValid(r)?parseInt(r,10):void 0},e.getPenaltyN1=function(r){const o=r.size;let i=0,s=0,a=0,l=null,u=null;for(let y=0;y<o;y++){s=a=0,l=u=null;for(let C=0;C<o;C++){let g=r.get(y,C);g===l?s++:(s>=5&&(i+=t.N1+(s-5)),l=g,s=1),g=r.get(C,y),g===u?a++:(a>=5&&(i+=t.N1+(a-5)),u=g,a=1)}s>=5&&(i+=t.N1+(s-5)),a>=5&&(i+=t.N1+(a-5))}return i},e.getPenaltyN2=function(r){const o=r.size;let i=0;for(let s=0;s<o-1;s++)for(let a=0;a<o-1;a++){const l=r.get(s,a)+r.get(s,a+1)+r.get(s+1,a)+r.get(s+1,a+1);(l===4||l===0)&&i++}return i*t.N2},e.getPenaltyN3=function(r){const o=r.size;let i=0,s=0,a=0;for(let l=0;l<o;l++){s=a=0;for(let u=0;u<o;u++)s=s<<1&2047|r.get(l,u),u>=10&&(s===1488||s===93)&&i++,a=a<<1&2047|r.get(u,l),u>=10&&(a===1488||a===93)&&i++}return i*t.N3},e.getPenaltyN4=function(r){let o=0;const i=r.data.length;for(let s=0;s<i;s++)o+=r.data[s];return Math.abs(Math.ceil(o*100/i/5)-10)*t.N4};function n(r,o,i){switch(r){case e.Patterns.PATTERN000:return(o+i)%2===0;case e.Patterns.PATTERN001:return o%2===0;case e.Patterns.PATTERN010:return i%3===0;case e.Patterns.PATTERN011:return(o+i)%3===0;case e.Patterns.PATTERN100:return(Math.floor(o/2)+Math.floor(i/3))%2===0;case e.Patterns.PATTERN101:return o*i%2+o*i%3===0;case e.Patterns.PATTERN110:return(o*i%2+o*i%3)%2===0;case e.Patterns.PATTERN111:return(o*i%3+(o+i)%2)%2===0;default:throw new Error("bad maskPattern:"+r)}}e.applyMask=function(r,o){const i=o.size;for(let s=0;s<i;s++)for(let a=0;a<i;a++)o.isReserved(a,s)||o.xor(a,s,n(r,a,s))},e.getBestMask=function(r,o){const i=Object.keys(e.Patterns).length;let s=0,a=1/0;for(let l=0;l<i;l++){o(l),e.applyMask(l,r);const u=e.getPenaltyN1(r)+e.getPenaltyN2(r)+e.getPenaltyN3(r)+e.getPenaltyN4(r);e.applyMask(l,r),u<a&&(a=u,s=l)}return s}})(Kt);var He={};const oe=qe,Ke=[1,1,1,1,1,1,1,1,1,1,2,2,1,2,2,4,1,2,4,4,2,4,4,4,2,4,6,5,2,4,6,6,2,5,8,8,4,5,8,8,4,5,8,11,4,8,10,11,4,9,12,16,4,9,16,16,6,10,12,18,6,10,17,16,6,11,16,19,6,13,18,21,7,14,21,25,8,16,20,25,8,17,23,25,9,17,23,34,9,18,25,30,10,20,27,32,12,21,29,35,12,23,34,37,12,25,34,40,13,26,35,42,14,28,38,45,15,29,40,48,16,31,43,51,17,33,45,54,18,35,48,57,19,37,51,60,19,38,53,63,20,40,56,66,21,43,59,70,22,45,62,74,24,47,65,77,25,49,68,81],Ye=[7,10,13,17,10,16,22,28,15,26,36,44,20,36,52,64,26,48,72,88,36,64,96,112,40,72,108,130,48,88,132,156,60,110,160,192,72,130,192,224,80,150,224,264,96,176,260,308,104,198,288,352,120,216,320,384,132,240,360,432,144,280,408,480,168,308,448,532,180,338,504,588,196,364,546,650,224,416,600,700,224,442,644,750,252,476,690,816,270,504,750,900,300,560,810,960,312,588,870,1050,336,644,952,1110,360,700,1020,1200,390,728,1050,1260,420,784,1140,1350,450,812,1200,1440,480,868,1290,1530,510,924,1350,1620,540,980,1440,1710,570,1036,1530,1800,570,1064,1590,1890,600,1120,1680,1980,630,1204,1770,2100,660,1260,1860,2220,720,1316,1950,2310,750,1372,2040,2430];He.getBlocksCount=function(e,t){switch(t){case oe.L:return Ke[(e-1)*4+0];case oe.M:return Ke[(e-1)*4+1];case oe.Q:return Ke[(e-1)*4+2];case oe.H:return Ke[(e-1)*4+3];default:return}},He.getTotalCodewordsCount=function(e,t){switch(t){case oe.L:return Ye[(e-1)*4+0];case oe.M:return Ye[(e-1)*4+1];case oe.Q:return Ye[(e-1)*4+2];case oe.H:return Ye[(e-1)*4+3];default:return}};var Yt={},Je={};const Pe=new Uint8Array(512),Ge=new Uint8Array(256);(function(){let e=1;for(let t=0;t<255;t++)Pe[t]=e,Ge[e]=t,e<<=1,e&256&&(e^=285);for(let t=255;t<512;t++)Pe[t]=Pe[t-255]})(),Je.log=function(e){if(e<1)throw new Error("log("+e+")");return Ge[e]},Je.exp=function(e){return Pe[e]},Je.mul=function(e,t){return e===0||t===0?0:Pe[Ge[e]+Ge[t]]},function(e){const t=Je;e.mul=function(n,r){const o=new Uint8Array(n.length+r.length-1);for(let i=0;i<n.length;i++)for(let s=0;s<r.length;s++)o[i+s]^=t.mul(n[i],r[s]);return o},e.mod=function(n,r){let o=new Uint8Array(n);for(;o.length-r.length>=0;){const i=o[0];for(let a=0;a<r.length;a++)o[a]^=t.mul(r[a],i);let s=0;for(;s<o.length&&o[s]===0;)s++;o=o.slice(s)}return o},e.generateECPolynomial=function(n){let r=new Uint8Array([1]);for(let o=0;o<n;o++)r=e.mul(r,new Uint8Array([1,t.exp(o)]));return r}}(Yt);const Jt=Yt;function dt(e){this.genPoly=void 0,this.degree=e,this.degree&&this.initialize(this.degree)}dt.prototype.initialize=function(e){this.degree=e,this.genPoly=Jt.generateECPolynomial(this.degree)},dt.prototype.encode=function(e){if(!this.genPoly)throw new Error("Encoder not initialized");const t=new Uint8Array(e.length+this.degree);t.set(e);const n=Jt.mod(t,this.genPoly),r=this.degree-n.length;if(r>0){const o=new Uint8Array(this.degree);return o.set(n,r),o}return n};var Un=dt,Gt={},se={},ut={};ut.isValid=function(e){return!isNaN(e)&&e>=1&&e<=40};var J={};const Qt="[0-9]+",Fn="[A-Z $%*+\\-./:]+";let Le="(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";Le=Le.replace(/u/g,"\\u");const Vn="(?:(?![A-Z0-9 $%*+\\-./:]|"+Le+`)(?:.|[\r
]))+`;J.KANJI=new RegExp(Le,"g"),J.BYTE_KANJI=new RegExp("[^A-Z0-9 $%*+\\-./:]+","g"),J.BYTE=new RegExp(Vn,"g"),J.NUMERIC=new RegExp(Qt,"g"),J.ALPHANUMERIC=new RegExp(Fn,"g");const qn=new RegExp("^"+Le+"$"),Hn=new RegExp("^"+Qt+"$"),Kn=new RegExp("^[A-Z0-9 $%*+\\-./:]+$");J.testKanji=function(e){return qn.test(e)},J.testNumeric=function(e){return Hn.test(e)},J.testAlphanumeric=function(e){return Kn.test(e)},function(e){const t=ut,n=J;e.NUMERIC={id:"Numeric",bit:1,ccBits:[10,12,14]},e.ALPHANUMERIC={id:"Alphanumeric",bit:2,ccBits:[9,11,13]},e.BYTE={id:"Byte",bit:4,ccBits:[8,16,16]},e.KANJI={id:"Kanji",bit:8,ccBits:[8,10,12]},e.MIXED={bit:-1},e.getCharCountIndicator=function(o,i){if(!o.ccBits)throw new Error("Invalid mode: "+o);if(!t.isValid(i))throw new Error("Invalid version: "+i);return i>=1&&i<10?o.ccBits[0]:i<27?o.ccBits[1]:o.ccBits[2]},e.getBestModeForData=function(o){return n.testNumeric(o)?e.NUMERIC:n.testAlphanumeric(o)?e.ALPHANUMERIC:n.testKanji(o)?e.KANJI:e.BYTE},e.toString=function(o){if(o&&o.id)return o.id;throw new Error("Invalid mode")},e.isValid=function(o){return o&&o.bit&&o.ccBits};function r(o){if(typeof o!="string")throw new Error("Param is not a string");switch(o.toLowerCase()){case"numeric":return e.NUMERIC;case"alphanumeric":return e.ALPHANUMERIC;case"kanji":return e.KANJI;case"byte":return e.BYTE;default:throw new Error("Unknown mode: "+o)}}e.from=function(o,i){if(e.isValid(o))return o;try{return r(o)}catch{return i}}}(se),function(e){const t=_,n=He,r=qe,o=se,i=ut,s=7973,a=t.getBCHDigit(s);function l(g,x,f){for(let b=1;b<=40;b++)if(x<=e.getCapacity(b,f,g))return b}function u(g,x){return o.getCharCountIndicator(g,x)+4}function y(g,x){let f=0;return g.forEach(function(b){const k=u(b.mode,x);f+=k+b.getBitsLength()}),f}function C(g,x){for(let f=1;f<=40;f++)if(y(g,f)<=e.getCapacity(f,x,o.MIXED))return f}e.from=function(g,x){return i.isValid(g)?parseInt(g,10):x},e.getCapacity=function(g,x,f){if(!i.isValid(g))throw new Error("Invalid QR Code version");typeof f>"u"&&(f=o.BYTE);const b=t.getSymbolTotalCodewords(g),k=n.getTotalCodewordsCount(g,x),d=(b-k)*8;if(f===o.MIXED)return d;const w=d-u(f,g);switch(f){case o.NUMERIC:return Math.floor(w/10*3);case o.ALPHANUMERIC:return Math.floor(w/11*2);case o.KANJI:return Math.floor(w/13);case o.BYTE:default:return Math.floor(w/8)}},e.getBestVersionForData=function(g,x){let f;const b=r.from(x,r.M);if(Array.isArray(g)){if(g.length>1)return C(g,b);if(g.length===0)return 1;f=g[0]}else f=g;return l(f.mode,f.getLength(),b)},e.getEncodedBits=function(g){if(!i.isValid(g)||g<7)throw new Error("Invalid QR Code version");let x=g<<12;for(;t.getBCHDigit(x)-a>=0;)x^=s<<t.getBCHDigit(x)-a;return g<<12|x}}(Gt);var Xt={};const ht=_,Zt=1335,Yn=21522,en=ht.getBCHDigit(Zt);Xt.getEncodedBits=function(e,t){const n=e.bit<<3|t;let r=n<<10;for(;ht.getBCHDigit(r)-en>=0;)r^=Zt<<ht.getBCHDigit(r)-en;return(n<<10|r)^Yn};var tn={};const Jn=se;function ve(e){this.mode=Jn.NUMERIC,this.data=e.toString()}ve.getBitsLength=function(e){return 10*Math.floor(e/3)+(e%3?e%3*3+1:0)},ve.prototype.getLength=function(){return this.data.length},ve.prototype.getBitsLength=function(){return ve.getBitsLength(this.data.length)},ve.prototype.write=function(e){let t,n,r;for(t=0;t+3<=this.data.length;t+=3)n=this.data.substr(t,3),r=parseInt(n,10),e.put(r,10);const o=this.data.length-t;o>0&&(n=this.data.substr(t),r=parseInt(n,10),e.put(r,o*3+1))};var Gn=ve;const Qn=se,pt=["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"," ","$","%","*","+","-",".","/",":"];function xe(e){this.mode=Qn.ALPHANUMERIC,this.data=e}xe.getBitsLength=function(e){return 11*Math.floor(e/2)+6*(e%2)},xe.prototype.getLength=function(){return this.data.length},xe.prototype.getBitsLength=function(){return xe.getBitsLength(this.data.length)},xe.prototype.write=function(e){let t;for(t=0;t+2<=this.data.length;t+=2){let n=pt.indexOf(this.data[t])*45;n+=pt.indexOf(this.data[t+1]),e.put(n,11)}this.data.length%2&&e.put(pt.indexOf(this.data[t]),6)};var Xn=xe,Zn=function(e){for(var t=[],n=e.length,r=0;r<n;r++){var o=e.charCodeAt(r);if(o>=55296&&o<=56319&&n>r+1){var i=e.charCodeAt(r+1);i>=56320&&i<=57343&&(o=(o-55296)*1024+i-56320+65536,r+=1)}if(o<128){t.push(o);continue}if(o<2048){t.push(o>>6|192),t.push(o&63|128);continue}if(o<55296||o>=57344&&o<65536){t.push(o>>12|224),t.push(o>>6&63|128),t.push(o&63|128);continue}if(o>=65536&&o<=1114111){t.push(o>>18|240),t.push(o>>12&63|128),t.push(o>>6&63|128),t.push(o&63|128);continue}t.push(239,191,189)}return new Uint8Array(t).buffer};const ei=Zn,ti=se;function $e(e){this.mode=ti.BYTE,typeof e=="string"&&(e=ei(e)),this.data=new Uint8Array(e)}$e.getBitsLength=function(e){return e*8},$e.prototype.getLength=function(){return this.data.length},$e.prototype.getBitsLength=function(){return $e.getBitsLength(this.data.length)},$e.prototype.write=function(e){for(let t=0,n=this.data.length;t<n;t++)e.put(this.data[t],8)};var ni=$e;const ii=se,ri=_;function Ce(e){this.mode=ii.KANJI,this.data=e}Ce.getBitsLength=function(e){return e*13},Ce.prototype.getLength=function(){return this.data.length},Ce.prototype.getBitsLength=function(){return Ce.getBitsLength(this.data.length)},Ce.prototype.write=function(e){let t;for(t=0;t<this.data.length;t++){let n=ri.toSJIS(this.data[t]);if(n>=33088&&n<=40956)n-=33088;else if(n>=57408&&n<=60351)n-=49472;else throw new Error("Invalid SJIS character: "+this.data[t]+`
Make sure your charset is UTF-8`);n=(n>>>8&255)*192+(n&255),e.put(n,13)}};var oi=Ce;(function(e){const t=se,n=Gn,r=Xn,o=ni,i=oi,s=J,a=_,l=En;function u(d){return unescape(encodeURIComponent(d)).length}function y(d,w,p){const m=[];let T;for(;(T=d.exec(p))!==null;)m.push({data:T[0],index:T.index,mode:w,length:T[0].length});return m}function C(d){const w=y(s.NUMERIC,t.NUMERIC,d),p=y(s.ALPHANUMERIC,t.ALPHANUMERIC,d);let m,T;return a.isKanjiModeEnabled()?(m=y(s.BYTE,t.BYTE,d),T=y(s.KANJI,t.KANJI,d)):(m=y(s.BYTE_KANJI,t.BYTE,d),T=[]),w.concat(p,m,T).sort(function(A,j){return A.index-j.index}).map(function(A){return{data:A.data,mode:A.mode,length:A.length}})}function g(d,w){switch(w){case t.NUMERIC:return n.getBitsLength(d);case t.ALPHANUMERIC:return r.getBitsLength(d);case t.KANJI:return i.getBitsLength(d);case t.BYTE:return o.getBitsLength(d)}}function x(d){return d.reduce(function(w,p){const m=w.length-1>=0?w[w.length-1]:null;return m&&m.mode===p.mode?(w[w.length-1].data+=p.data,w):(w.push(p),w)},[])}function f(d){const w=[];for(let p=0;p<d.length;p++){const m=d[p];switch(m.mode){case t.NUMERIC:w.push([m,{data:m.data,mode:t.ALPHANUMERIC,length:m.length},{data:m.data,mode:t.BYTE,length:m.length}]);break;case t.ALPHANUMERIC:w.push([m,{data:m.data,mode:t.BYTE,length:m.length}]);break;case t.KANJI:w.push([m,{data:m.data,mode:t.BYTE,length:u(m.data)}]);break;case t.BYTE:w.push([{data:m.data,mode:t.BYTE,length:u(m.data)}])}}return w}function b(d,w){const p={},m={start:{}};let T=["start"];for(let A=0;A<d.length;A++){const j=d[A],K=[];for(let Me=0;Me<j.length;Me++){const Y=j[Me],Ee=""+A+Me;K.push(Ee),p[Ee]={node:Y,lastCount:0},m[Ee]={};for(let ot=0;ot<T.length;ot++){const X=T[ot];p[X]&&p[X].node.mode===Y.mode?(m[X][Ee]=g(p[X].lastCount+Y.length,Y.mode)-g(p[X].lastCount,Y.mode),p[X].lastCount+=Y.length):(p[X]&&(p[X].lastCount=Y.length),m[X][Ee]=g(Y.length,Y.mode)+4+t.getCharCountIndicator(Y.mode,w))}}T=K}for(let A=0;A<T.length;A++)m[T[A]].end=0;return{map:m,table:p}}function k(d,w){let p;const m=t.getBestModeForData(d);if(p=t.from(w,m),p!==t.BYTE&&p.bit<m.bit)throw new Error('"'+d+'" cannot be encoded with mode '+t.toString(p)+`.
 Suggested mode is: `+t.toString(m));switch(p===t.KANJI&&!a.isKanjiModeEnabled()&&(p=t.BYTE),p){case t.NUMERIC:return new n(d);case t.ALPHANUMERIC:return new r(d);case t.KANJI:return new i(d);case t.BYTE:return new o(d)}}e.fromArray=function(d){return d.reduce(function(w,p){return typeof p=="string"?w.push(k(p,null)):p.data&&w.push(k(p.data,p.mode)),w},[])},e.fromString=function(d,w){const p=C(d,a.isKanjiModeEnabled()),m=f(p),T=b(m,w),A=l.find_path(T.map,"start","end"),j=[];for(let K=1;K<A.length-1;K++)j.push(T.table[A[K]].node);return e.fromArray(x(j))},e.rawSplit=function(d){return e.fromArray(C(d,a.isKanjiModeEnabled()))}})(tn);const Qe=_,gt=qe,si=zn,ai=_n,li=Vt,ci=qt,ft=Kt,wt=He,di=Un,Xe=Gt,ui=Xt,hi=se,mt=tn;function pi(e,t){const n=e.size,r=ci.getPositions(t);for(let o=0;o<r.length;o++){const i=r[o][0],s=r[o][1];for(let a=-1;a<=7;a++)if(!(i+a<=-1||n<=i+a))for(let l=-1;l<=7;l++)s+l<=-1||n<=s+l||(a>=0&&a<=6&&(l===0||l===6)||l>=0&&l<=6&&(a===0||a===6)||a>=2&&a<=4&&l>=2&&l<=4?e.set(i+a,s+l,!0,!0):e.set(i+a,s+l,!1,!0))}}function gi(e){const t=e.size;for(let n=8;n<t-8;n++){const r=n%2===0;e.set(n,6,r,!0),e.set(6,n,r,!0)}}function fi(e,t){const n=li.getPositions(t);for(let r=0;r<n.length;r++){const o=n[r][0],i=n[r][1];for(let s=-2;s<=2;s++)for(let a=-2;a<=2;a++)s===-2||s===2||a===-2||a===2||s===0&&a===0?e.set(o+s,i+a,!0,!0):e.set(o+s,i+a,!1,!0)}}function wi(e,t){const n=e.size,r=Xe.getEncodedBits(t);let o,i,s;for(let a=0;a<18;a++)o=Math.floor(a/3),i=a%3+n-8-3,s=(r>>a&1)===1,e.set(o,i,s,!0),e.set(i,o,s,!0)}function bt(e,t,n){const r=e.size,o=ui.getEncodedBits(t,n);let i,s;for(i=0;i<15;i++)s=(o>>i&1)===1,i<6?e.set(i,8,s,!0):i<8?e.set(i+1,8,s,!0):e.set(r-15+i,8,s,!0),i<8?e.set(8,r-i-1,s,!0):i<9?e.set(8,15-i-1+1,s,!0):e.set(8,15-i-1,s,!0);e.set(r-8,8,1,!0)}function mi(e,t){const n=e.size;let r=-1,o=n-1,i=7,s=0;for(let a=n-1;a>0;a-=2)for(a===6&&a--;;){for(let l=0;l<2;l++)if(!e.isReserved(o,a-l)){let u=!1;s<t.length&&(u=(t[s]>>>i&1)===1),e.set(o,a-l,u),i--,i===-1&&(s++,i=7)}if(o+=r,o<0||n<=o){o-=r,r=-r;break}}}function bi(e,t,n){const r=new si;n.forEach(function(l){r.put(l.mode.bit,4),r.put(l.getLength(),hi.getCharCountIndicator(l.mode,e)),l.write(r)});const o=Qe.getSymbolTotalCodewords(e),i=wt.getTotalCodewordsCount(e,t),s=(o-i)*8;for(r.getLengthInBits()+4<=s&&r.put(0,4);r.getLengthInBits()%8!==0;)r.putBit(0);const a=(s-r.getLengthInBits())/8;for(let l=0;l<a;l++)r.put(l%2?17:236,8);return yi(r,e,t)}function yi(e,t,n){const r=Qe.getSymbolTotalCodewords(t),o=wt.getTotalCodewordsCount(t,n),i=r-o,s=wt.getBlocksCount(t,n),a=r%s,l=s-a,u=Math.floor(r/s),y=Math.floor(i/s),C=y+1,g=u-y,x=new di(g);let f=0;const b=new Array(s),k=new Array(s);let d=0;const w=new Uint8Array(e.buffer);for(let j=0;j<s;j++){const K=j<l?y:C;b[j]=w.slice(f,f+K),k[j]=x.encode(b[j]),f+=K,d=Math.max(d,K)}const p=new Uint8Array(r);let m=0,T,A;for(T=0;T<d;T++)for(A=0;A<s;A++)T<b[A].length&&(p[m++]=b[A][T]);for(T=0;T<g;T++)for(A=0;A<s;A++)p[m++]=k[A][T];return p}function vi(e,t,n,r){let o;if(Array.isArray(e))o=mt.fromArray(e);else if(typeof e=="string"){let u=t;if(!u){const y=mt.rawSplit(e);u=Xe.getBestVersionForData(y,n)}o=mt.fromString(e,u||40)}else throw new Error("Invalid data");const i=Xe.getBestVersionForData(o,n);if(!i)throw new Error("The amount of data is too big to be stored in a QR Code");if(!t)t=i;else if(t<i)throw new Error(`
The chosen QR Code version cannot contain this amount of data.
Minimum version required to store current data is: `+i+`.
`);const s=bi(t,n,o),a=Qe.getSymbolSize(t),l=new ai(a);return pi(l,t),gi(l),fi(l,t),bt(l,n,0),t>=7&&wi(l,t),mi(l,s),isNaN(r)&&(r=ft.getBestMask(l,bt.bind(null,l,n))),ft.applyMask(r,l),bt(l,n,r),{modules:l,version:t,errorCorrectionLevel:n,maskPattern:r,segments:o}}Ut.create=function(e,t){if(typeof e>"u"||e==="")throw new Error("No input text");let n=gt.M,r,o;return typeof t<"u"&&(n=gt.from(t.errorCorrectionLevel,gt.M),r=Xe.from(t.version),o=ft.from(t.maskPattern),t.toSJISFunc&&Qe.setToSJISFunction(t.toSJISFunc)),vi(e,r,n,o)};var nn={},yt={};(function(e){function t(n){if(typeof n=="number"&&(n=n.toString()),typeof n!="string")throw new Error("Color should be defined as hex string");let r=n.slice().replace("#","").split("");if(r.length<3||r.length===5||r.length>8)throw new Error("Invalid hex color: "+n);(r.length===3||r.length===4)&&(r=Array.prototype.concat.apply([],r.map(function(i){return[i,i]}))),r.length===6&&r.push("F","F");const o=parseInt(r.join(""),16);return{r:o>>24&255,g:o>>16&255,b:o>>8&255,a:o&255,hex:"#"+r.slice(0,6).join("")}}e.getOptions=function(n){n||(n={}),n.color||(n.color={});const r=typeof n.margin>"u"||n.margin===null||n.margin<0?4:n.margin,o=n.width&&n.width>=21?n.width:void 0,i=n.scale||4;return{width:o,scale:o?4:i,margin:r,color:{dark:t(n.color.dark||"#000000ff"),light:t(n.color.light||"#ffffffff")},type:n.type,rendererOpts:n.rendererOpts||{}}},e.getScale=function(n,r){return r.width&&r.width>=n+r.margin*2?r.width/(n+r.margin*2):r.scale},e.getImageWidth=function(n,r){const o=e.getScale(n,r);return Math.floor((n+r.margin*2)*o)},e.qrToImageData=function(n,r,o){const i=r.modules.size,s=r.modules.data,a=e.getScale(i,o),l=Math.floor((i+o.margin*2)*a),u=o.margin*a,y=[o.color.light,o.color.dark];for(let C=0;C<l;C++)for(let g=0;g<l;g++){let x=(C*l+g)*4,f=o.color.light;if(C>=u&&g>=u&&C<l-u&&g<l-u){const b=Math.floor((C-u)/a),k=Math.floor((g-u)/a);f=y[s[b*i+k]?1:0]}n[x++]=f.r,n[x++]=f.g,n[x++]=f.b,n[x]=f.a}}})(yt),function(e){const t=yt;function n(o,i,s){o.clearRect(0,0,i.width,i.height),i.style||(i.style={}),i.height=s,i.width=s,i.style.height=s+"px",i.style.width=s+"px"}function r(){try{return document.createElement("canvas")}catch{throw new Error("You need to specify a canvas element")}}e.render=function(o,i,s){let a=s,l=i;typeof a>"u"&&(!i||!i.getContext)&&(a=i,i=void 0),i||(l=r()),a=t.getOptions(a);const u=t.getImageWidth(o.modules.size,a),y=l.getContext("2d"),C=y.createImageData(u,u);return t.qrToImageData(C.data,o,a),n(y,l,u),y.putImageData(C,0,0),l},e.renderToDataURL=function(o,i,s){let a=s;typeof a>"u"&&(!i||!i.getContext)&&(a=i,i=void 0),a||(a={});const l=e.render(o,i,a),u=a.type||"image/png",y=a.rendererOpts||{};return l.toDataURL(u,y.quality)}}(nn);var rn={};const xi=yt;function on(e,t){const n=e.a/255,r=t+'="'+e.hex+'"';return n<1?r+" "+t+'-opacity="'+n.toFixed(2).slice(1)+'"':r}function vt(e,t,n){let r=e+t;return typeof n<"u"&&(r+=" "+n),r}function $i(e,t,n){let r="",o=0,i=!1,s=0;for(let a=0;a<e.length;a++){const l=Math.floor(a%t),u=Math.floor(a/t);!l&&!i&&(i=!0),e[a]?(s++,a>0&&l>0&&e[a-1]||(r+=i?vt("M",l+n,.5+u+n):vt("m",o,0),o=0,i=!1),l+1<t&&e[a+1]||(r+=vt("h",s),s=0)):o++}return r}rn.render=function(e,t,n){const r=xi.getOptions(t),o=e.modules.size,i=e.modules.data,s=o+r.margin*2,a=r.color.light.a?"<path "+on(r.color.light,"fill")+' d="M0 0h'+s+"v"+s+'H0z"/>':"",l="<path "+on(r.color.dark,"stroke")+' d="'+$i(i,o,r.margin)+'"/>',u='viewBox="0 0 '+s+" "+s+'"',y='<svg xmlns="http://www.w3.org/2000/svg" '+(r.width?'width="'+r.width+'" height="'+r.width+'" ':"")+u+' shape-rendering="crispEdges">'+a+l+`</svg>
`;return typeof n=="function"&&n(null,y),y};const Ci=Wn,xt=Ut,sn=nn,ki=rn;function $t(e,t,n,r,o){const i=[].slice.call(arguments,1),s=i.length,a=typeof i[s-1]=="function";if(!a&&!Ci())throw new Error("Callback required as last argument");if(a){if(s<2)throw new Error("Too few arguments provided");s===2?(o=n,n=t,t=r=void 0):s===3&&(t.getContext&&typeof o>"u"?(o=r,r=void 0):(o=r,r=n,n=t,t=void 0))}else{if(s<1)throw new Error("Too few arguments provided");return s===1?(n=t,t=r=void 0):s===2&&!t.getContext&&(r=n,n=t,t=void 0),new Promise(function(l,u){try{const y=xt.create(n,r);l(e(y,t,r))}catch(y){u(y)}})}try{const l=xt.create(n,r);o(null,e(l,t,r))}catch(l){o(l)}}Ie.create=xt.create,Ie.toCanvas=$t.bind(null,sn.render),Ie.toDataURL=$t.bind(null,sn.renderToDataURL),Ie.toString=$t.bind(null,function(e,t,n){return ki.render(e,n)});const Ei=.1,an=2.5,te=7;function Ct(e,t,n){return e===t?!1:(e-t<0?t-e:e-t)<=n+Ei}function Ri(e,t){const n=Array.prototype.slice.call(Ie.create(e,{errorCorrectionLevel:t}).modules.data,0),r=Math.sqrt(n.length);return n.reduce((o,i,s)=>(s%r===0?o.push([i]):o[o.length-1].push(i))&&o,[])}const Ti={generate({uri:e,size:t,logoSize:n,padding:r=8,dotColor:o="var(--apkt-colors-black)"}){const i=[],s=Ri(e,"Q"),a=(t-2*r)/s.length,l=[{x:0,y:0},{x:1,y:0},{x:0,y:1}];l.forEach(({x:f,y:b})=>{const k=(s.length-te)*a*f+r,d=(s.length-te)*a*b+r,w=.45;for(let p=0;p<l.length;p+=1){const m=a*(te-p*2);i.push(_e`
            <rect
              fill=${p===2?"var(--apkt-colors-black)":"var(--apkt-colors-white)"}
              width=${p===0?m-10:m}
              rx= ${p===0?(m-10)*w:m*w}
              ry= ${p===0?(m-10)*w:m*w}
              stroke=${o}
              stroke-width=${p===0?10:0}
              height=${p===0?m-10:m}
              x= ${p===0?d+a*p+10/2:d+a*p}
              y= ${p===0?k+a*p+10/2:k+a*p}
            />
          `)}});const u=Math.floor((n+25)/a),y=s.length/2-u/2,C=s.length/2+u/2-1,g=[];s.forEach((f,b)=>{f.forEach((k,d)=>{if(s[b][d]&&!(b<te&&d<te||b>s.length-(te+1)&&d<te||b<te&&d>s.length-(te+1))&&!(b>y&&b<C&&d>y&&d<C)){const w=b*a+a/2+r,p=d*a+a/2+r;g.push([w,p])}})});const x={};return g.forEach(([f,b])=>{var k;x[f]?(k=x[f])==null||k.push(b):x[f]=[b]}),Object.entries(x).map(([f,b])=>{const k=b.filter(d=>b.every(w=>!Ct(d,w,a)));return[Number(f),k]}).forEach(([f,b])=>{b.forEach(k=>{i.push(_e`<circle cx=${f} cy=${k} fill=${o} r=${a/an} />`)})}),Object.entries(x).filter(([f,b])=>b.length>1).map(([f,b])=>{const k=b.filter(d=>b.some(w=>Ct(d,w,a)));return[Number(f),k]}).map(([f,b])=>{b.sort((d,w)=>d<w?-1:1);const k=[];for(const d of b){const w=k.find(p=>p.some(m=>Ct(d,m,a)));w?w.push(d):k.push([d])}return[f,k.map(d=>[d[0],d[d.length-1]])]}).forEach(([f,b])=>{b.forEach(([k,d])=>{i.push(_e`
              <line
                x1=${f}
                x2=${f}
                y1=${k}
                y2=${d}
                stroke=${o}
                stroke-width=${a/(an/2)}
                stroke-linecap="round"
              />
            `)})}),i}},Ai=B`
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
`;var ae=function(e,t,n,r){var o=arguments.length,i=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(o<3?s(i):o>3?s(t,n,i):s(t,n))||i);return o>3&&i&&Object.defineProperty(t,n,i),i};let G=class extends S{constructor(){super(...arguments),this.uri="",this.size=500,this.theme="dark",this.imageSrc=void 0,this.alt=void 0,this.arenaClear=void 0,this.farcaster=void 0}render(){return this.dataset.theme=this.theme,this.dataset.clear=String(this.arenaClear),c`<wui-flex
      alignItems="center"
      justifyContent="center"
      class="wui-qr-code"
      direction="column"
      gap="4"
      width="100%"
      style="height: 100%"
    >
      ${this.templateVisual()} ${this.templateSvg()}
    </wui-flex>`}templateSvg(){return _e`
      <svg viewBox="0 0 ${this.size} ${this.size}" width="100%" height="100%">
        ${Ti.generate({uri:this.uri,size:this.size,logoSize:this.arenaClear?0:this.size/4})}
      </svg>
    `}templateVisual(){var e;return this.imageSrc?c`<wui-image src=${this.imageSrc} alt=${(e=this.alt)!=null?e:"logo"}></wui-image>`:this.farcaster?c`<wui-icon
        class="farcaster"
        size="inherit"
        color="inherit"
        name="farcaster"
      ></wui-icon>`:c`<wui-icon size="inherit" color="inherit" name="walletConnect"></wui-icon>`}};G.styles=[q,Ai],ae([h()],G.prototype,"uri",void 0),ae([h({type:Number})],G.prototype,"size",void 0),ae([h()],G.prototype,"theme",void 0),ae([h()],G.prototype,"imageSrc",void 0),ae([h()],G.prototype,"alt",void 0),ae([h({type:Boolean})],G.prototype,"arenaClear",void 0),ae([h({type:Boolean})],G.prototype,"farcaster",void 0),G=ae([R("wui-qr-code")],G);const Ii=B`
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
`;var ln=function(e,t,n,r){var o=arguments.length,i=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(o<3?s(i):o>3?s(t,n,i):s(t,n))||i);return o>3&&i&&Object.defineProperty(t,n,i),i};let Ze=class extends O{constructor(){super(),this.basic=!1}firstUpdated(){var e,t,n,r;this.basic||z.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:(t=(e=this.wallet)==null?void 0:e.name)!=null?t:"WalletConnect",platform:"qrcode",displayIndex:(n=this.wallet)==null?void 0:n.display_index,walletRank:(r=this.wallet)==null?void 0:r.order,view:$.state.view}})}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this.unsubscribe)==null||e.forEach(t=>t())}render(){return this.onRenderProxy(),c`
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
    `}onRenderProxy(){!this.ready&&this.uri&&(this.ready=!0)}qrCodeTemplate(){var n;if(!this.uri||!this.ready)return null;const e=this.wallet?this.wallet.name:void 0;E.setWcLinking(void 0),E.setRecentWallet(this.wallet);const t=(n=ze.state.themeVariables["--apkt-qr-color"])!=null?n:ze.state.themeVariables["--w3m-qr-color"];return c` <wui-qr-code
      theme=${ze.state.themeMode}
      uri=${this.uri}
      imageSrc=${P(ie.getWalletImage(this.wallet))}
      color=${P(t)}
      alt=${P(e)}
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
    </wui-button>`}};Ze.styles=Ii,ln([h({type:Boolean})],Ze.prototype,"basic",void 0),Ze=ln([R("w3m-connecting-wc-qrcode")],Ze);var Si=function(e,t,n,r){var o=arguments.length,i=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(o<3?s(i):o>3?s(t,n,i):s(t,n))||i);return o>3&&i&&Object.defineProperty(t,n,i),i};let cn=class extends S{constructor(){var e,t,n;if(super(),this.wallet=(e=$.state.data)==null?void 0:e.wallet,!this.wallet)throw new Error("w3m-connecting-wc-unsupported: No wallet provided");z.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"browser",displayIndex:(t=this.wallet)==null?void 0:t.display_index,walletRank:(n=this.wallet)==null?void 0:n.order,view:$.state.view}})}render(){return c`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${["10","5","5","5"]}
        gap="5"
      >
        <wui-wallet-image
          size="lg"
          imageSrc=${P(ie.getWalletImage(this.wallet))}
        ></wui-wallet-image>

        <wui-text variant="md-regular" color="primary">Not Detected</wui-text>
      </wui-flex>

      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links>
    `}};cn=Si([R("w3m-connecting-wc-unsupported")],cn);var dn=function(e,t,n,r){var o=arguments.length,i=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(o<3?s(i):o>3?s(t,n,i):s(t,n))||i);return o>3&&i&&Object.defineProperty(t,n,i),i};let kt=class extends O{constructor(){var e,t;if(super(),this.isLoading=!0,!this.wallet)throw new Error("w3m-connecting-wc-web: No wallet provided");this.onConnect=this.onConnectProxy.bind(this),this.secondaryBtnLabel="Open",this.secondaryLabel=Nt.CONNECT_LABELS.MOBILE,this.secondaryBtnIcon="externalLink",this.updateLoadingState(),this.unsubscribe.push(E.subscribeKey("wcUri",()=>{this.updateLoadingState()})),z.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"web",displayIndex:(e=this.wallet)==null?void 0:e.display_index,walletRank:(t=this.wallet)==null?void 0:t.order,view:$.state.view}})}updateLoadingState(){this.isLoading=!this.uri}onConnectProxy(){var e;if((e=this.wallet)!=null&&e.webapp_link&&this.uri)try{this.error=!1;const{webapp_link:t,name:n}=this.wallet,{redirect:r,href:o}=I.formatUniversalUrl(t,this.uri);E.setWcLinking({name:n,href:o}),E.setRecentWallet(this.wallet),I.openHref(r,"_blank")}catch{this.error=!0}}};dn([v()],kt.prototype,"isLoading",void 0),kt=dn([R("w3m-connecting-wc-web")],kt);const Pi=B`
  :host([data-mobile-fullscreen='true']) {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  :host([data-mobile-fullscreen='true']) wui-ux-by-reown {
    margin-top: auto;
  }
`;var pe=function(e,t,n,r){var o=arguments.length,i=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(o<3?s(i):o>3?s(t,n,i):s(t,n))||i);return o>3&&i&&Object.defineProperty(t,n,i),i};let ne=class extends S{constructor(){var e;super(),this.wallet=(e=$.state.data)==null?void 0:e.wallet,this.unsubscribe=[],this.platform=void 0,this.platforms=[],this.isSiwxEnabled=!!N.state.siwx,this.remoteFeatures=N.state.remoteFeatures,this.displayBranding=!0,this.basic=!1,this.determinePlatforms(),this.initializeConnection(),this.unsubscribe.push(N.subscribeKey("remoteFeatures",t=>this.remoteFeatures=t))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return N.state.enableMobileFullScreen&&this.setAttribute("data-mobile-fullscreen","true"),c`
      ${this.headerTemplate()}
      <div class="platform-container">${this.platformTemplate()}</div>
      ${this.reownBrandingTemplate()}
    `}reownBrandingTemplate(){var e;return!((e=this.remoteFeatures)!=null&&e.reownBranding)||!this.displayBranding?null:c`<wui-ux-by-reown></wui-ux-by-reown>`}async initializeConnection(e=!1){var t,n,r,o,i;if(!(this.platform==="browser"||N.state.manualWCControl&&!e))try{const{wcPairingExpiry:s,status:a}=E.state,{redirectView:l}=(t=$.state.data)!=null?t:{};if(e||N.state.enableEmbedded||I.isPairingExpired(s)||a==="connecting"){const u=E.getConnections(Z.state.activeChain),y=(n=this.remoteFeatures)==null?void 0:n.multiWallet,C=u.length>0;await E.connectWalletConnect({cache:"never"}),this.isSiwxEnabled||(C&&y?($.replace("ProfileWallets"),Re.showSuccess("New Wallet Added")):l?$.replace(l):Lt.close())}}catch(s){if(s instanceof Error&&s.message.includes("An error occurred when attempting to switch chain")&&!N.state.enableNetworkSwitch&&Z.state.activeChain){Z.setActiveCaipNetwork(yn.getUnsupportedNetwork(`${Z.state.activeChain}:${(r=Z.state.activeCaipNetwork)==null?void 0:r.id}`)),Z.showUnsupportedChainUI();return}s instanceof Bt&&s.originalName===Ot.PROVIDER_RPC_ERROR_NAME.USER_REJECTED_REQUEST?z.sendEvent({type:"track",event:"USER_REJECTED",properties:{message:s.message}}):z.sendEvent({type:"track",event:"CONNECT_ERROR",properties:{message:(o=s==null?void 0:s.message)!=null?o:"Unknown"}}),E.setWcError(!0),Re.showError((i=s.message)!=null?i:"Connection error"),E.resetWcConnection(),$.goBack()}}determinePlatforms(){if(!this.wallet){this.platforms.push("qrcode"),this.platform="qrcode";return}if(this.platform)return;const{mobile_link:e,desktop_link:t,webapp_link:n,injected:r,rdns:o}=this.wallet,i=r==null?void 0:r.map(({injected_id:x})=>x).filter(Boolean),s=[...o?[o]:i!=null?i:[]],a=N.state.isUniversalProvider?!1:s.length,l=e,u=n,y=E.checkInstalled(s),C=a&&y,g=t&&!I.isMobile();C&&!Z.state.noAdapters&&this.platforms.push("browser"),l&&this.platforms.push(I.isMobile()?"mobile":"qrcode"),u&&this.platforms.push("web"),g&&this.platforms.push("desktop"),!C&&a&&!Z.state.noAdapters&&this.platforms.push("unsupported"),this.platform=this.platforms[0]}platformTemplate(){switch(this.platform){case"browser":return c`<w3m-connecting-wc-browser></w3m-connecting-wc-browser>`;case"web":return c`<w3m-connecting-wc-web></w3m-connecting-wc-web>`;case"desktop":return c`
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
    `:null}async onSelectPlatform(e){var n;const t=(n=this.shadowRoot)==null?void 0:n.querySelector("div");t&&(await t.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.platform=e,t.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"}))}};ne.styles=Pi,pe([v()],ne.prototype,"platform",void 0),pe([v()],ne.prototype,"platforms",void 0),pe([v()],ne.prototype,"isSiwxEnabled",void 0),pe([v()],ne.prototype,"remoteFeatures",void 0),pe([h({type:Boolean})],ne.prototype,"displayBranding",void 0),pe([h({type:Boolean})],ne.prototype,"basic",void 0),ne=pe([R("w3m-connecting-wc-view")],ne);var Et=function(e,t,n,r){var o=arguments.length,i=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(o<3?s(i):o>3?s(t,n,i):s(t,n))||i);return o>3&&i&&Object.defineProperty(t,n,i),i};let Be=class extends S{constructor(){super(),this.unsubscribe=[],this.isMobile=I.isMobile(),this.remoteFeatures=N.state.remoteFeatures,this.unsubscribe.push(N.subscribeKey("remoteFeatures",e=>this.remoteFeatures=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){if(this.isMobile){const{featured:e,recommended:t}=L.state,{customWallets:n}=N.state,r=vn.getRecentWallets(),o=e.length||t.length||(n==null?void 0:n.length)||r.length;return c`<wui-flex flexDirection="column" gap="2" .margin=${["1","3","3","3"]}>
        ${o?c`<w3m-connector-list></w3m-connector-list>`:null}
        <w3m-all-wallets-widget></w3m-all-wallets-widget>
      </wui-flex>`}return c`<wui-flex flexDirection="column" .padding=${["0","0","4","0"]}>
        <w3m-connecting-wc-view ?basic=${!0} .displayBranding=${!1}></w3m-connecting-wc-view>
        <wui-flex flexDirection="column" .padding=${["0","3","0","3"]}>
          <w3m-all-wallets-widget></w3m-all-wallets-widget>
        </wui-flex>
      </wui-flex>
      ${this.reownBrandingTemplate()} `}reownBrandingTemplate(){var e;return(e=this.remoteFeatures)!=null&&e.reownBranding?c` <wui-flex flexDirection="column" .padding=${["1","0","1","0"]}>
      <wui-ux-by-reown></wui-ux-by-reown>
    </wui-flex>`:null}};Et([v()],Be.prototype,"isMobile",void 0),Et([v()],Be.prototype,"remoteFeatures",void 0),Be=Et([R("w3m-connecting-wc-basic-view")],Be);/**
* @license
* Copyright 2020 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/const Li=e=>e.strings===void 0;/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/const Oe=(e,t)=>{var r;const n=e._$AN;if(n===void 0)return!1;for(const o of n)(r=o._$AO)==null||r.call(o,t,!1),Oe(o,t);return!0},et=e=>{let t,n;do{if((t=e._$AM)===void 0)break;n=t._$AN,n.delete(e),e=t}while((n==null?void 0:n.size)===0)},un=e=>{for(let t;t=e._$AM;e=t){let n=t._$AN;if(n===void 0)t._$AN=n=new Set;else if(n.has(e))break;n.add(e),Ni(t)}};function Bi(e){this._$AN!==void 0?(et(this),this._$AM=e,un(this)):this._$AM=e}function Oi(e,t=!1,n=0){const r=this._$AH,o=this._$AN;if(o!==void 0&&o.size!==0)if(t)if(Array.isArray(r))for(let i=n;i<r.length;i++)Oe(r[i],!1),et(r[i]);else r!=null&&(Oe(r,!1),et(r));else Oe(this,e)}const Ni=e=>{var t,n;e.type==$n.CHILD&&((t=e._$AP)!=null||(e._$AP=Oi),(n=e._$AQ)!=null||(e._$AQ=Bi))};class ji extends xn{constructor(){super(...arguments),this._$AN=void 0}_$AT(t,n,r){super._$AT(t,n,r),un(this),this.isConnected=t._$AU}_$AO(t,n=!0){var r,o;t!==this.isConnected&&(this.isConnected=t,t?(r=this.reconnected)==null||r.call(this):(o=this.disconnected)==null||o.call(this)),n&&(Oe(this,t),et(this))}setValue(t){if(Li(this._$Ct))this._$Ct._$AI(t,this);else{const n=[...this._$Ct._$AH];n[this._$Ci]=t,this._$Ct._$AI(n,this,0)}}disconnected(){}reconnected(){}}/**
* @license
* Copyright 2020 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/const Rt=()=>new Wi;class Wi{}const Tt=new WeakMap,At=Cn(class extends ji{render(e){return jt}update(e,[t]){var r;const n=t!==this.G;return n&&this.G!==void 0&&this.rt(void 0),(n||this.lt!==this.ct)&&(this.G=t,this.ht=(r=e.options)==null?void 0:r.host,this.rt(this.ct=e.element)),jt}rt(e){var t;if(this.isConnected||(e=void 0),typeof this.G=="function"){const n=(t=this.ht)!=null?t:globalThis;let r=Tt.get(n);r===void 0&&(r=new WeakMap,Tt.set(n,r)),r.get(this.G)!==void 0&&this.G.call(this.ht,void 0),r.set(this.G,e),e!==void 0&&this.G.call(this.ht,e)}else this.G.value=e}get lt(){var e,t,n;return typeof this.G=="function"?(t=Tt.get((e=this.ht)!=null?e:globalThis))==null?void 0:t.get(this.G):(n=this.G)==null?void 0:n.value}disconnected(){this.lt===this.ct&&this.rt(void 0)}reconnected(){this.rt(this.ct)}}),Mi=B`
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
`;var tt=function(e,t,n,r){var o=arguments.length,i=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(o<3?s(i):o>3?s(t,n,i):s(t,n))||i);return o>3&&i&&Object.defineProperty(t,n,i),i};let ke=class extends S{constructor(){super(...arguments),this.inputElementRef=Rt(),this.checked=!1,this.disabled=!1,this.size="md"}render(){return c`
      <label data-size=${this.size}>
        <input
          ${At(this.inputElementRef)}
          type="checkbox"
          ?checked=${this.checked}
          ?disabled=${this.disabled}
          @change=${this.dispatchChangeEvent.bind(this)}
        />
        <span></span>
      </label>
    `}dispatchChangeEvent(){var e;this.dispatchEvent(new CustomEvent("switchChange",{detail:(e=this.inputElementRef.value)==null?void 0:e.checked,bubbles:!0,composed:!0}))}};ke.styles=[q,le,Mi],tt([h({type:Boolean})],ke.prototype,"checked",void 0),tt([h({type:Boolean})],ke.prototype,"disabled",void 0),tt([h()],ke.prototype,"size",void 0),ke=tt([R("wui-toggle")],ke);const zi=B`
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
`;var hn=function(e,t,n,r){var o=arguments.length,i=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(o<3?s(i):o>3?s(t,n,i):s(t,n))||i);return o>3&&i&&Object.defineProperty(t,n,i),i};let nt=class extends S{constructor(){super(...arguments),this.checked=!1}render(){return c`
      <wui-flex>
        <wui-icon size="xl" name="walletConnectBrown"></wui-icon>
        <wui-toggle
          ?checked=${this.checked}
          size="sm"
          @switchChange=${this.handleToggleChange.bind(this)}
        ></wui-toggle>
      </wui-flex>
    `}handleToggleChange(e){e.stopPropagation(),this.checked=e.detail,this.dispatchSwitchEvent()}dispatchSwitchEvent(){this.dispatchEvent(new CustomEvent("certifiedSwitchChange",{detail:this.checked,bubbles:!0,composed:!0}))}};nt.styles=[q,le,zi],hn([h({type:Boolean})],nt.prototype,"checked",void 0),nt=hn([R("wui-certified-switch")],nt);const _i=B`
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
`;var D=function(e,t,n,r){var o=arguments.length,i=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(o<3?s(i):o>3?s(t,n,i):s(t,n))||i);return o>3&&i&&Object.defineProperty(t,n,i),i};let W=class extends S{constructor(){super(...arguments),this.inputElementRef=Rt(),this.disabled=!1,this.loading=!1,this.placeholder="",this.type="text",this.value="",this.size="md"}render(){return c` <div class="wui-input-text-container">
        ${this.templateLeftIcon()}
        <input
          data-size=${this.size}
          ${At(this.inputElementRef)}
          data-testid="wui-input-text"
          type=${this.type}
          enterkeyhint=${P(this.enterKeyHint)}
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
      </button>`:null}templateError(){return this.errorText?c`<wui-text variant="sm-regular" color="error">${this.errorText}</wui-text>`:null}templateWarning(){return this.warningText?c`<wui-text variant="sm-regular" color="warning">${this.warningText}</wui-text>`:null}dispatchInputChangeEvent(){var e;this.dispatchEvent(new CustomEvent("inputChange",{detail:(e=this.inputElementRef.value)==null?void 0:e.value,bubbles:!0,composed:!0}))}};W.styles=[q,le,_i],D([h()],W.prototype,"icon",void 0),D([h({type:Boolean})],W.prototype,"disabled",void 0),D([h({type:Boolean})],W.prototype,"loading",void 0),D([h()],W.prototype,"placeholder",void 0),D([h()],W.prototype,"type",void 0),D([h()],W.prototype,"value",void 0),D([h()],W.prototype,"errorText",void 0),D([h()],W.prototype,"warningText",void 0),D([h()],W.prototype,"onSubmit",void 0),D([h()],W.prototype,"size",void 0),D([h({attribute:!1})],W.prototype,"onKeyDown",void 0),W=D([R("wui-input-text")],W);const Di=B`
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
`;var pn=function(e,t,n,r){var o=arguments.length,i=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(o<3?s(i):o>3?s(t,n,i):s(t,n))||i);return o>3&&i&&Object.defineProperty(t,n,i),i};let it=class extends S{constructor(){super(...arguments),this.inputComponentRef=Rt(),this.inputValue=""}render(){return c`
      <wui-input-text
        ${At(this.inputComponentRef)}
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
    `}onInputChange(e){this.inputValue=e.detail||""}clearValue(){var t;const e=(t=this.inputComponentRef.value)==null?void 0:t.inputElementRef.value;e&&(e.value="",this.inputValue="",e.focus(),e.dispatchEvent(new Event("input")))}};it.styles=[q,Di],pn([h()],it.prototype,"inputValue",void 0),it=pn([R("wui-search-bar")],it);const Ui=B`
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
`;var gn=function(e,t,n,r){var o=arguments.length,i=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(o<3?s(i):o>3?s(t,n,i):s(t,n))||i);return o>3&&i&&Object.defineProperty(t,n,i),i};let rt=class extends S{constructor(){super(...arguments),this.type="wallet"}render(){return c`
      ${this.shimmerTemplate()}
      <wui-shimmer width="80px" height="20px"></wui-shimmer>
    `}shimmerTemplate(){return this.type==="network"?c` <wui-shimmer data-type=${this.type} width="48px" height="54px"></wui-shimmer>
        ${kn}`:c`<wui-shimmer width="56px" height="56px"></wui-shimmer>`}};rt.styles=[q,le,Ui],gn([h()],rt.prototype,"type",void 0),rt=gn([R("wui-card-select-loader")],rt);const Fi=Wt`
  :host {
    display: grid;
    width: inherit;
    height: inherit;
  }
`;var U=function(e,t,n,r){var o=arguments.length,i=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(o<3?s(i):o>3?s(t,n,i):s(t,n))||i);return o>3&&i&&Object.defineProperty(t,n,i),i};let M=class extends S{render(){return this.style.cssText=`
      grid-template-rows: ${this.gridTemplateRows};
      grid-template-columns: ${this.gridTemplateColumns};
      justify-items: ${this.justifyItems};
      align-items: ${this.alignItems};
      justify-content: ${this.justifyContent};
      align-content: ${this.alignContent};
      column-gap: ${this.columnGap&&`var(--apkt-spacing-${this.columnGap})`};
      row-gap: ${this.rowGap&&`var(--apkt-spacing-${this.rowGap})`};
      gap: ${this.gap&&`var(--apkt-spacing-${this.gap})`};
      padding-top: ${this.padding&&ee.getSpacingStyles(this.padding,0)};
      padding-right: ${this.padding&&ee.getSpacingStyles(this.padding,1)};
      padding-bottom: ${this.padding&&ee.getSpacingStyles(this.padding,2)};
      padding-left: ${this.padding&&ee.getSpacingStyles(this.padding,3)};
      margin-top: ${this.margin&&ee.getSpacingStyles(this.margin,0)};
      margin-right: ${this.margin&&ee.getSpacingStyles(this.margin,1)};
      margin-bottom: ${this.margin&&ee.getSpacingStyles(this.margin,2)};
      margin-left: ${this.margin&&ee.getSpacingStyles(this.margin,3)};
    `,c`<slot></slot>`}};M.styles=[q,Fi],U([h()],M.prototype,"gridTemplateRows",void 0),U([h()],M.prototype,"gridTemplateColumns",void 0),U([h()],M.prototype,"justifyItems",void 0),U([h()],M.prototype,"alignItems",void 0),U([h()],M.prototype,"justifyContent",void 0),U([h()],M.prototype,"alignContent",void 0),U([h()],M.prototype,"columnGap",void 0),U([h()],M.prototype,"rowGap",void 0),U([h()],M.prototype,"gap",void 0),U([h()],M.prototype,"padding",void 0),U([h()],M.prototype,"margin",void 0),M=U([R("wui-grid")],M);const Vi=B`
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
`;var Q=function(e,t,n,r){var o=arguments.length,i=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(o<3?s(i):o>3?s(t,n,i):s(t,n))||i);return o>3&&i&&Object.defineProperty(t,n,i),i};let F=class extends S{constructor(){super(),this.observer=new IntersectionObserver(()=>{}),this.visible=!1,this.imageSrc=void 0,this.imageLoading=!1,this.isImpressed=!1,this.explorerId="",this.walletQuery="",this.certified=!1,this.displayIndex=0,this.wallet=void 0,this.observer=new IntersectionObserver(e=>{e.forEach(t=>{t.isIntersecting?(this.visible=!0,this.fetchImageSrc(),this.sendImpressionEvent()):this.visible=!1})},{threshold:.01})}firstUpdated(){this.observer.observe(this)}disconnectedCallback(){this.observer.disconnect()}render(){var t,n;const e=((t=this.wallet)==null?void 0:t.badge_type)==="certified";return c`
      <button>
        ${this.imageTemplate()}
        <wui-flex flexDirection="row" alignItems="center" justifyContent="center" gap="1">
          <wui-text
            variant="md-regular"
            color="inherit"
            class=${P(e?"certified":void 0)}
            >${(n=this.wallet)==null?void 0:n.name}</wui-text
          >
          ${e?c`<wui-icon size="sm" name="walletConnectBrown"></wui-icon>`:null}
        </wui-flex>
      </button>
    `}imageTemplate(){var e,t,n;return!this.visible&&!this.imageSrc||this.imageLoading?this.shimmerTemplate():c`
      <wui-wallet-image
        size="lg"
        imageSrc=${P(this.imageSrc)}
        name=${P((e=this.wallet)==null?void 0:e.name)}
        .installed=${(n=(t=this.wallet)==null?void 0:t.installed)!=null?n:!1}
        badgeSize="sm"
      >
      </wui-wallet-image>
    `}shimmerTemplate(){return c`<wui-shimmer width="56px" height="56px"></wui-shimmer>`}async fetchImageSrc(){this.wallet&&(this.imageSrc=ie.getWalletImage(this.wallet),!this.imageSrc&&(this.imageLoading=!0,this.imageSrc=await ie.fetchWalletImage(this.wallet.image_id),this.imageLoading=!1))}sendImpressionEvent(){!this.wallet||this.isImpressed||(this.isImpressed=!0,z.sendWalletImpressionEvent({name:this.wallet.name,walletRank:this.wallet.order,explorerId:this.explorerId,view:$.state.view,query:this.walletQuery,certified:this.certified,displayIndex:this.displayIndex}))}};F.styles=Vi,Q([v()],F.prototype,"visible",void 0),Q([v()],F.prototype,"imageSrc",void 0),Q([v()],F.prototype,"imageLoading",void 0),Q([v()],F.prototype,"isImpressed",void 0),Q([h()],F.prototype,"explorerId",void 0),Q([h()],F.prototype,"walletQuery",void 0),Q([h()],F.prototype,"certified",void 0),Q([h()],F.prototype,"displayIndex",void 0),Q([h({type:Object})],F.prototype,"wallet",void 0),F=Q([R("w3m-all-wallets-list-item")],F);const qi=B`
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
`;var Ne=function(e,t,n,r){var o=arguments.length,i=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(o<3?s(i):o>3?s(t,n,i):s(t,n))||i);return o>3&&i&&Object.defineProperty(t,n,i),i};const fn="local-paginator";let ge=class extends S{constructor(){super(),this.unsubscribe=[],this.paginationObserver=void 0,this.loading=!L.state.wallets.length,this.wallets=L.state.wallets,this.mobileFullScreen=N.state.enableMobileFullScreen,this.unsubscribe.push(L.subscribeKey("wallets",e=>this.wallets=e))}firstUpdated(){this.initialFetch(),this.createPaginationObserver()}disconnectedCallback(){var e;this.unsubscribe.forEach(t=>t()),(e=this.paginationObserver)==null||e.disconnect()}render(){return this.mobileFullScreen&&this.setAttribute("data-mobile-fullscreen","true"),c`
      <wui-grid
        data-scroll=${!this.loading}
        .padding=${["0","3","3","3"]}
        gap="2"
        justifyContent="space-between"
      >
        ${this.loading?this.shimmerTemplate(16):this.walletsTemplate()}
        ${this.paginationLoaderTemplate()}
      </wui-grid>
    `}async initialFetch(){var t;this.loading=!0;const e=(t=this.shadowRoot)==null?void 0:t.querySelector("wui-grid");e&&(await L.fetchWalletsByPage({page:1}),await e.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.loading=!1,e.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"}))}shimmerTemplate(e,t){return[...Array(e)].map(()=>c`
        <wui-card-select-loader type="wallet" id=${P(t)}></wui-card-select-loader>
      `)}walletsTemplate(){return at.getWalletConnectWallets(this.wallets).map((e,t)=>c`
        <w3m-all-wallets-list-item
          data-testid="wallet-search-item-${e.id}"
          @click=${()=>this.onConnectWallet(e)}
          .wallet=${e}
          explorerId=${e.id}
          certified=${this.badge==="certified"}
          displayIndex=${t}
        ></w3m-all-wallets-list-item>
      `)}paginationLoaderTemplate(){const{wallets:e,recommended:t,featured:n,count:r,mobileFilteredOutWalletsLength:o}=L.state,i=window.innerWidth<352?3:4,s=e.length+t.length;let a=Math.ceil(s/i)*i-s+i;return a-=e.length?n.length%i:0,r===0&&n.length>0?null:r===0||[...n,...e,...t].length<r-(o!=null?o:0)?this.shimmerTemplate(a,fn):null}createPaginationObserver(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(`#${fn}`);e&&(this.paginationObserver=new IntersectionObserver(([n])=>{if(n!=null&&n.isIntersecting&&!this.loading){const{page:r,count:o,wallets:i}=L.state;i.length<o&&L.fetchWalletsByPage({page:r+1})}}),this.paginationObserver.observe(e))}onConnectWallet(e){V.selectWalletConnector(e)}};ge.styles=qi,Ne([v()],ge.prototype,"loading",void 0),Ne([v()],ge.prototype,"wallets",void 0),Ne([v()],ge.prototype,"badge",void 0),Ne([v()],ge.prototype,"mobileFullScreen",void 0),ge=Ne([R("w3m-all-wallets-list")],ge);const Hi=Wt`
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
`;var je=function(e,t,n,r){var o=arguments.length,i=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(o<3?s(i):o>3?s(t,n,i):s(t,n))||i);return o>3&&i&&Object.defineProperty(t,n,i),i};let fe=class extends S{constructor(){super(...arguments),this.prevQuery="",this.prevBadge=void 0,this.loading=!0,this.mobileFullScreen=N.state.enableMobileFullScreen,this.query=""}render(){return this.mobileFullScreen&&this.setAttribute("data-mobile-fullscreen","true"),this.onSearch(),this.loading?c`<wui-loading-spinner color="accent-primary"></wui-loading-spinner>`:this.walletsTemplate()}async onSearch(){(this.query.trim()!==this.prevQuery.trim()||this.badge!==this.prevBadge)&&(this.prevQuery=this.query,this.prevBadge=this.badge,this.loading=!0,await L.searchWallet({search:this.query,badge:this.badge}),this.loading=!1)}walletsTemplate(){const{search:e}=L.state,t=at.markWalletsAsInstalled(e),n=at.filterWalletsByWcSupport(t);return n.length?c`
      <wui-grid
        data-testid="wallet-list"
        .padding=${["0","3","3","3"]}
        rowGap="4"
        columngap="2"
        justifyContent="space-between"
      >
        ${n.map((r,o)=>c`
            <w3m-all-wallets-list-item
              @click=${()=>this.onConnectWallet(r)}
              .wallet=${r}
              data-testid="wallet-search-item-${r.id}"
              explorerId=${r.id}
              certified=${this.badge==="certified"}
              walletQuery=${this.query}
              displayIndex=${o}
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
      `}onConnectWallet(e){V.selectWalletConnector(e)}};fe.styles=Hi,je([v()],fe.prototype,"loading",void 0),je([v()],fe.prototype,"mobileFullScreen",void 0),je([h()],fe.prototype,"query",void 0),je([h()],fe.prototype,"badge",void 0),fe=je([R("w3m-all-wallets-search")],fe);var It=function(e,t,n,r){var o=arguments.length,i=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(o<3?s(i):o>3?s(t,n,i):s(t,n))||i);return o>3&&i&&Object.defineProperty(t,n,i),i};let We=class extends S{constructor(){super(...arguments),this.search="",this.badge=void 0,this.onDebouncedSearch=I.debounce(e=>{this.search=e})}render(){const e=this.search.length>=2;return c`
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
    `}onInputChange(e){this.onDebouncedSearch(e.detail)}onCertifiedSwitchChange(e){e.detail?(this.badge="certified",Re.showSvg("Only WalletConnect certified",{icon:"walletConnectBrown",iconColor:"accent-100"})):this.badge=void 0}qrButtonTemplate(){return I.isMobile()?c`
        <wui-icon-box
          size="xl"
          iconSize="xl"
          color="accent-primary"
          icon="qrCode"
          border
          borderColor="wui-accent-glass-010"
          @click=${this.onWalletConnectQr.bind(this)}
        ></wui-icon-box>
      `:null}onWalletConnectQr(){$.push("ConnectingWalletConnect")}};It([v()],We.prototype,"search",void 0),It([v()],We.prototype,"badge",void 0),We=It([R("w3m-all-wallets-view")],We);var Ki=function(e,t,n,r){var o=arguments.length,i=o<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,n,r);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(i=(o<3?s(i):o>3?s(t,n,i):s(t,n))||i);return o>3&&i&&Object.defineProperty(t,n,i),i};let St=class extends S{constructor(){var e;super(...arguments),this.wallet=(e=$.state.data)==null?void 0:e.wallet}render(){if(!this.wallet)throw new Error("w3m-downloads-view");return c`
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
    `:null}openStore(e){e.href&&this.wallet&&(z.sendEvent({type:"track",event:"GET_WALLET",properties:{name:this.wallet.name,walletRank:this.wallet.order,explorerId:this.wallet.id,type:e.type}}),I.openHref(e.href,"_blank"))}onChromeStore(){var e;(e=this.wallet)!=null&&e.chrome_store&&this.openStore({href:this.wallet.chrome_store,type:"chrome_store"})}onAppStore(){var e;(e=this.wallet)!=null&&e.app_store&&this.openStore({href:this.wallet.app_store,type:"app_store"})}onPlayStore(){var e;(e=this.wallet)!=null&&e.play_store&&this.openStore({href:this.wallet.play_store,type:"play_store"})}onHomePage(){var e;(e=this.wallet)!=null&&e.homepage&&this.openStore({href:this.wallet.homepage,type:"homepage"})}};St=Ki([R("w3m-downloads-view")],St);export{We as W3mAllWalletsView,Be as W3mConnectingWcBasicView,St as W3mDownloadsView};
