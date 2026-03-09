import{N as k,u as Pt,R as w,S as I,b as j,c as C,E as q,v as Be,x as je,j as g,B as Ee,a as H,y as Pe,z as Ce,D as Ct,o as ot,F as Qt,C as z,G as at,I as rt,J as nt,M as L,K as $t,e as S,r as ee,i as T,d as c,k as Fe,w as Nt,P as Xt,L as Zt,Q as R,U as Jt,H as X,O as P,V as Rt,h as M,X as $e,t as qe,f as ei,A as Me,T as ti,Y as ii,Z as oi}from"./core-CEODdLY4.js";import{c as x,n as u,o as A,r as h,a as ai,U as Ve,b as Ot}from"./index-Cj5O-YXS.js";import"./ui.js";import"./index-CHaV_rpS.js";import"./bootstrap-BB2ZDjSb.js";import"./networkCapabilities-CTmxm8jd.js";const de={getGasPriceInEther(e,t){const i=t*e;return Number(i)/1e18},getGasPriceInUSD(e,t,i){const a=de.getGasPriceInEther(t,i);return k.bigNumber(e).times(a).toNumber()},getPriceImpact({sourceTokenAmount:e,sourceTokenPriceInUSD:t,toTokenPriceInUSD:i,toTokenAmount:a}){const r=k.bigNumber(e).times(t),o=k.bigNumber(a).times(i);return r.minus(o).div(r).times(100).toNumber()},getMaxSlippage(e,t){const i=k.bigNumber(e).div(100);return k.multiply(t,i).toNumber()},getProviderFee(e,t=.0085){return k.bigNumber(e).times(t).toString()},isInsufficientNetworkTokenForGas(e,t){const i=t||"0";return k.bigNumber(e).eq(0)?!0:k.bigNumber(k.bigNumber(i)).gt(e)},isInsufficientSourceTokenForSwap(e,t,i){var r,o;const a=(o=(r=i==null?void 0:i.find(n=>n.address===t))==null?void 0:r.quantity)==null?void 0:o.numeric;return k.bigNumber(a||"0").lt(e)}},_t=15e4,ri=6,W={initializing:!1,initialized:!1,loadingPrices:!1,loadingQuote:!1,loadingApprovalTransaction:!1,loadingBuildTransaction:!1,loadingTransaction:!1,switchingTokens:!1,fetchError:!1,approvalTransaction:void 0,swapTransaction:void 0,transactionError:void 0,sourceToken:void 0,sourceTokenAmount:"",sourceTokenPriceInUSD:0,toToken:void 0,toTokenAmount:"",toTokenPriceInUSD:0,networkPrice:"0",networkBalanceInUSD:"0",networkTokenSymbol:"",inputError:void 0,slippage:ot.CONVERT_SLIPPAGE_TOLERANCE,tokens:void 0,popularTokens:void 0,suggestedTokens:void 0,foundTokens:void 0,myTokensWithBalance:void 0,tokensPriceMap:{},gasFee:"0",gasPriceInUSD:0,priceImpact:void 0,maxSlippage:void 0,providerFee:void 0},l=nt({...W}),Ge={state:l,subscribe(e){return rt(l,()=>e(l))},subscribeKey(e,t){return at(l,e,t)},getParams(){var m,b,E,D,_,F,ce,le,Se,Ie;const e=g.state.activeChain,t=(b=(m=g.getAccountData(e))==null?void 0:m.caipAddress)!=null?b:g.state.activeCaipAddress,i=H.getPlainAddress(t),a=Qt(),r=z.getConnectorId(g.state.activeChain);if(!i)throw new Error("No address found to swap the tokens from.");const o=!((E=l.toToken)!=null&&E.address)||!((D=l.toToken)!=null&&D.decimals),n=!((_=l.sourceToken)!=null&&_.address)||!((F=l.sourceToken)!=null&&F.decimals)||!k.bigNumber(l.sourceTokenAmount).gt(0),s=!l.sourceTokenAmount;return{networkAddress:a,fromAddress:i,fromCaipAddress:t,sourceTokenAddress:(ce=l.sourceToken)==null?void 0:ce.address,toTokenAddress:(le=l.toToken)==null?void 0:le.address,toTokenAmount:l.toTokenAmount,toTokenDecimals:(Se=l.toToken)==null?void 0:Se.decimals,sourceTokenAmount:l.sourceTokenAmount,sourceTokenDecimals:(Ie=l.sourceToken)==null?void 0:Ie.decimals,invalidToToken:o,invalidSourceToken:n,invalidSourceTokenAmount:s,availableToSwap:t&&!o&&!n&&!s,isAuthConnector:r===C.CONNECTOR_ID.AUTH}},async setSourceToken(e){if(!e){l.sourceToken=e,l.sourceTokenAmount="",l.sourceTokenPriceInUSD=0;return}l.sourceToken=e,await y.setTokenPrice(e.address,"sourceToken")},setSourceTokenAmount(e){l.sourceTokenAmount=e},async setToToken(e){if(!e){l.toToken=e,l.toTokenAmount="",l.toTokenPriceInUSD=0;return}l.toToken=e,await y.setTokenPrice(e.address,"toToken")},setToTokenAmount(e){l.toTokenAmount=e?k.toFixed(e,ri):""},async setTokenPrice(e,t){let i=l.tokensPriceMap[e]||0;i||(l.loadingPrices=!0,i=await y.getAddressPrice(e)),t==="sourceToken"?l.sourceTokenPriceInUSD=i:t==="toToken"&&(l.toTokenPriceInUSD=i),l.loadingPrices&&(l.loadingPrices=!1),y.getParams().availableToSwap&&!l.switchingTokens&&y.swapTokens()},async switchTokens(){if(!(l.initializing||!l.initialized||l.switchingTokens)){l.switchingTokens=!0;try{const e=l.toToken?{...l.toToken}:void 0,t=l.sourceToken?{...l.sourceToken}:void 0,i=e&&l.toTokenAmount===""?"1":l.toTokenAmount;y.setSourceTokenAmount(i),y.setToTokenAmount(""),await y.setSourceToken(e),await y.setToToken(t),l.switchingTokens=!1,y.swapTokens()}catch(e){throw l.switchingTokens=!1,e}}},resetState(){l.myTokensWithBalance=W.myTokensWithBalance,l.tokensPriceMap=W.tokensPriceMap,l.initialized=W.initialized,l.initializing=W.initializing,l.switchingTokens=W.switchingTokens,l.sourceToken=W.sourceToken,l.sourceTokenAmount=W.sourceTokenAmount,l.sourceTokenPriceInUSD=W.sourceTokenPriceInUSD,l.toToken=W.toToken,l.toTokenAmount=W.toTokenAmount,l.toTokenPriceInUSD=W.toTokenPriceInUSD,l.networkPrice=W.networkPrice,l.networkTokenSymbol=W.networkTokenSymbol,l.networkBalanceInUSD=W.networkBalanceInUSD,l.inputError=W.inputError},resetValues(){var i;const{networkAddress:e}=y.getParams(),t=(i=l.tokens)==null?void 0:i.find(a=>a.address===e);y.setSourceToken(t),y.setToToken(void 0)},getApprovalLoadingState(){return l.loadingApprovalTransaction},clearError(){l.transactionError=void 0},async initializeState(){if(!l.initializing){if(l.initializing=!0,!l.initialized)try{await y.fetchTokens(),l.initialized=!0}catch{l.initialized=!1,I.showError("Failed to initialize swap"),w.goBack()}l.initializing=!1}},async fetchTokens(){var i;const{networkAddress:e}=y.getParams();await y.getNetworkTokenPrice(),await y.getMyTokensWithBalance();const t=(i=l.myTokensWithBalance)==null?void 0:i.find(a=>a.address===e);t&&(l.networkTokenSymbol=t.symbol,y.setSourceToken(t),y.setSourceTokenAmount("0"))},async getTokenList(){var t,i;const e=(t=g.state.activeCaipNetwork)==null?void 0:t.caipNetworkId;if(!(l.caipNetworkId===e&&l.tokens))try{l.tokensLoading=!0;const a=await Pe.getTokenList(e);l.tokens=a,l.caipNetworkId=e,l.popularTokens=a.sort((n,s)=>n.symbol<s.symbol?-1:n.symbol>s.symbol?1:0);const r=(e&&((i=ot.SUGGESTED_TOKENS_BY_CHAIN)==null?void 0:i[e])||[]).map(n=>a.find(s=>s.symbol===n)).filter(n=>!!n),o=(ot.SWAP_SUGGESTED_TOKENS||[]).map(n=>a.find(s=>s.symbol===n)).filter(n=>!!n).filter(n=>!r.some(s=>s.address===n.address));l.suggestedTokens=[...r,...o]}catch{l.tokens=[],l.popularTokens=[],l.suggestedTokens=[]}finally{l.tokensLoading=!1}},async getAddressPrice(e){var n,s,m;const t=l.tokensPriceMap[e];if(t)return t;const i=((n=await Ee.fetchTokenPrice({addresses:[e]}))==null?void 0:n.fungibles)||[],a=(s=[...l.tokens||[],...l.myTokensWithBalance||[]].find(b=>b.address===e))==null?void 0:s.symbol,r=((m=i.find(b=>b.symbol.toLowerCase()===(a==null?void 0:a.toLowerCase())))==null?void 0:m.price)||0,o=parseFloat(r.toString());return l.tokensPriceMap[e]=o,o},async getNetworkTokenPrice(){var a;const{networkAddress:e}=y.getParams(),t=(a=(await Ee.fetchTokenPrice({addresses:[e]}).catch(()=>(I.showError("Failed to fetch network token price"),{fungibles:[]}))).fungibles)==null?void 0:a[0],i=(t==null?void 0:t.price.toString())||"0";l.tokensPriceMap[e]=parseFloat(i),l.networkTokenSymbol=(t==null?void 0:t.symbol)||"",l.networkPrice=i},async getMyTokensWithBalance(e){var a;const t=await Ct.getMyTokensWithBalance({forceUpdate:e,caipNetwork:g.state.activeCaipNetwork,address:(a=g.getAccountData())==null?void 0:a.address}),i=Pe.mapBalancesToSwapTokens(t);i&&(await y.getInitialGasPrice(),y.setBalances(i))},setBalances(e){const{networkAddress:t}=y.getParams(),i=g.state.activeCaipNetwork;if(!i)return;const a=e.find(r=>r.address===t);e.forEach(r=>{l.tokensPriceMap[r.address]=r.price||0}),l.myTokensWithBalance=e.filter(r=>r.address.startsWith(i.caipNetworkId)),l.networkBalanceInUSD=a?k.multiply(a.quantity.numeric,a.price).toString():"0"},async getInitialGasPrice(){var t,i,a,r;const e=await Pe.fetchGasPrice();if(!e)return{gasPrice:null,gasPriceInUSD:null};switch((i=(t=g.state)==null?void 0:t.activeCaipNetwork)==null?void 0:i.chainNamespace){case C.CHAIN.SOLANA:return l.gasFee=(a=e.standard)!=null?a:"0",l.gasPriceInUSD=k.multiply(e.standard,l.networkPrice).div(1e9).toNumber(),{gasPrice:BigInt(l.gasFee),gasPriceInUSD:Number(l.gasPriceInUSD)};case C.CHAIN.EVM:default:const o=(r=e.standard)!=null?r:"0",n=BigInt(o),s=BigInt(_t),m=de.getGasPriceInUSD(l.networkPrice,s,n);return l.gasFee=o,l.gasPriceInUSD=m,{gasPrice:n,gasPriceInUSD:m}}},async swapTokens(){var o,n,s;const e=(o=g.getAccountData())==null?void 0:o.address,t=l.sourceToken,i=l.toToken,a=k.bigNumber(l.sourceTokenAmount).gt(0);if(a||y.setToTokenAmount(""),!i||!t||l.loadingPrices||!a||!e)return;l.loadingQuote=!0;const r=k.bigNumber(l.sourceTokenAmount).times(10**t.decimals).round(0).toFixed(0);try{const m=await Ee.fetchSwapQuote({userAddress:e,from:t.address,to:i.address,gasPrice:l.gasFee,amount:r.toString()});l.loadingQuote=!1;const b=(s=(n=m==null?void 0:m.quotes)==null?void 0:n[0])==null?void 0:s.toAmount;if(!b){Ce.open({displayMessage:"Incorrect amount",debugMessage:"Please enter a valid amount"},"error");return}const E=k.bigNumber(b).div(10**i.decimals).toString();y.setToTokenAmount(E),y.hasInsufficientToken(l.sourceTokenAmount,t.address)?l.inputError="Insufficient balance":(l.inputError=void 0,y.setTransactionDetails())}catch(m){const b=await Pe.handleSwapError(m);l.loadingQuote=!1,l.inputError=b||"Insufficient balance"}},async getTransaction(){const{fromCaipAddress:e,availableToSwap:t}=y.getParams(),i=l.sourceToken,a=l.toToken;if(!(!e||!t||!i||!a||l.loadingQuote))try{l.loadingBuildTransaction=!0;const r=await Pe.fetchSwapAllowance({userAddress:e,tokenAddress:i.address,sourceTokenAmount:l.sourceTokenAmount,sourceTokenDecimals:i.decimals});let o;return r?o=await y.createSwapTransaction():o=await y.createAllowanceTransaction(),l.loadingBuildTransaction=!1,l.fetchError=!1,o}catch{w.goBack(),I.showError("Failed to check allowance"),l.loadingBuildTransaction=!1,l.approvalTransaction=void 0,l.swapTransaction=void 0,l.fetchError=!0;return}},async createAllowanceTransaction(){const{fromCaipAddress:e,sourceTokenAddress:t,toTokenAddress:i}=y.getParams();if(!(!e||!i)){if(!t)throw new Error("createAllowanceTransaction - No source token address found.");try{const a=await Ee.generateApproveCalldata({from:t,to:i,userAddress:e}),r=H.getPlainAddress(a.tx.from);if(!r)throw new Error("SwapController:createAllowanceTransaction - address is required");const o={data:a.tx.data,to:r,gasPrice:BigInt(a.tx.eip155.gasPrice),value:BigInt(a.tx.value),toAmount:l.toTokenAmount};return l.swapTransaction=void 0,l.approvalTransaction={data:o.data,to:o.to,gasPrice:o.gasPrice,value:o.value,toAmount:o.toAmount},{data:o.data,to:o.to,gasPrice:o.gasPrice,value:o.value,toAmount:o.toAmount}}catch{w.goBack(),I.showError("Failed to create approval transaction"),l.approvalTransaction=void 0,l.swapTransaction=void 0,l.fetchError=!0;return}}},async createSwapTransaction(){var n;const{networkAddress:e,fromCaipAddress:t,sourceTokenAmount:i}=y.getParams(),a=l.sourceToken,r=l.toToken;if(!t||!i||!a||!r)return;const o=(n=j.parseUnits(i,a.decimals))==null?void 0:n.toString();try{const s=await Ee.generateSwapCalldata({userAddress:t,from:a.address,to:r.address,amount:o,disableEstimate:!0}),m=a.address===e,b=BigInt(s.tx.eip155.gas),E=BigInt(s.tx.eip155.gasPrice),D=H.getPlainAddress(s.tx.to);if(!D)throw new Error("SwapController:createSwapTransaction - address is required");const _={data:s.tx.data,to:D,gas:b,gasPrice:E,value:BigInt(m&&o!=null?o:"0"),toAmount:l.toTokenAmount};return l.gasPriceInUSD=de.getGasPriceInUSD(l.networkPrice,b,E),l.approvalTransaction=void 0,l.swapTransaction=_,_}catch{w.goBack(),I.showError("Failed to create transaction"),l.approvalTransaction=void 0,l.swapTransaction=void 0,l.fetchError=!0;return}},onEmbeddedWalletApprovalSuccess(){I.showLoading("Approve limit increase in your wallet"),w.replace("SwapPreview")},async sendTransactionForApproval(e){var a,r,o;const{fromAddress:t,isAuthConnector:i}=y.getParams();l.loadingApprovalTransaction=!0,i?w.pushTransactionStack({onSuccess:y.onEmbeddedWalletApprovalSuccess}):I.showLoading("Approve limit increase in your wallet");try{await j.sendTransaction({address:t,to:e.to,data:e.data,value:e.value,chainNamespace:C.CHAIN.EVM}),await y.swapTokens(),await y.getTransaction(),l.approvalTransaction=void 0,l.loadingApprovalTransaction=!1}catch(n){const s=n;l.transactionError=s==null?void 0:s.displayMessage,l.loadingApprovalTransaction=!1,I.showError((s==null?void 0:s.displayMessage)||"Transaction error"),q.sendEvent({type:"track",event:"SWAP_APPROVAL_ERROR",properties:{message:(s==null?void 0:s.displayMessage)||(s==null?void 0:s.message)||"Unknown",network:((a=g.state.activeCaipNetwork)==null?void 0:a.caipNetworkId)||"",swapFromToken:((r=y.state.sourceToken)==null?void 0:r.symbol)||"",swapToToken:((o=y.state.toToken)==null?void 0:o.symbol)||"",swapFromAmount:y.state.sourceTokenAmount||"",swapToAmount:y.state.toTokenAmount||"",isSmartAccount:Be(C.CHAIN.EVM)===je.ACCOUNT_TYPES.SMART_ACCOUNT}})}},async sendTransactionForSwap(e){var n,s,m,b,E,D,_,F,ce,le,Se,Ie;if(!e)return;const{fromAddress:t,toTokenAmount:i,isAuthConnector:a}=y.getParams();l.loadingTransaction=!0;const r=`Swapping ${(n=l.sourceToken)==null?void 0:n.symbol} to ${k.formatNumberToLocalString(i,3)} ${(s=l.toToken)==null?void 0:s.symbol}`,o=`Swapped ${(m=l.sourceToken)==null?void 0:m.symbol} to ${k.formatNumberToLocalString(i,3)} ${(b=l.toToken)==null?void 0:b.symbol}`;a?w.pushTransactionStack({onSuccess(){w.replace("Account"),I.showLoading(r),Ge.resetState()}}):I.showLoading("Confirm transaction in your wallet");try{const it=[(E=l.sourceToken)==null?void 0:E.address,(D=l.toToken)==null?void 0:D.address].join(","),B=await j.sendTransaction({address:t,to:e.to,data:e.data,value:e.value,chainNamespace:C.CHAIN.EVM});return l.loadingTransaction=!1,I.showSuccess(o),q.sendEvent({type:"track",event:"SWAP_SUCCESS",properties:{network:((_=g.state.activeCaipNetwork)==null?void 0:_.caipNetworkId)||"",swapFromToken:((F=y.state.sourceToken)==null?void 0:F.symbol)||"",swapToToken:((ce=y.state.toToken)==null?void 0:ce.symbol)||"",swapFromAmount:y.state.sourceTokenAmount||"",swapToAmount:y.state.toTokenAmount||"",isSmartAccount:Be(C.CHAIN.EVM)===je.ACCOUNT_TYPES.SMART_ACCOUNT}}),Ge.resetState(),a||w.replace("Account"),Ge.getMyTokensWithBalance(it),B}catch(it){const B=it;l.transactionError=B==null?void 0:B.displayMessage,l.loadingTransaction=!1,I.showError((B==null?void 0:B.displayMessage)||"Transaction error"),q.sendEvent({type:"track",event:"SWAP_ERROR",properties:{message:(B==null?void 0:B.displayMessage)||(B==null?void 0:B.message)||"Unknown",network:((le=g.state.activeCaipNetwork)==null?void 0:le.caipNetworkId)||"",swapFromToken:((Se=y.state.sourceToken)==null?void 0:Se.symbol)||"",swapToToken:((Ie=y.state.toToken)==null?void 0:Ie.symbol)||"",swapFromAmount:y.state.sourceTokenAmount||"",swapToAmount:y.state.toTokenAmount||"",isSmartAccount:Be(C.CHAIN.EVM)===je.ACCOUNT_TYPES.SMART_ACCOUNT}});return}},hasInsufficientToken(e,t){return de.isInsufficientSourceTokenForSwap(e,t,l.myTokensWithBalance)},setTransactionDetails(){const{toTokenAddress:e,toTokenDecimals:t}=y.getParams();!e||!t||(l.gasPriceInUSD=de.getGasPriceInUSD(l.networkPrice,BigInt(l.gasFee),BigInt(_t)),l.priceImpact=de.getPriceImpact({sourceTokenAmount:l.sourceTokenAmount,sourceTokenPriceInUSD:l.sourceTokenPriceInUSD,toTokenPriceInUSD:l.toTokenPriceInUSD,toTokenAmount:l.toTokenAmount}),l.maxSlippage=de.getMaxSlippage(l.slippage,l.toTokenAmount),l.providerFee=de.getProviderFee(l.sourceTokenAmount))}},y=Pt(Ge),Z=nt({message:"",open:!1,triggerRect:{width:0,height:0,top:0,left:0},variant:"shade"}),ni={state:Z,subscribe(e){return rt(Z,()=>e(Z))},subscribeKey(e,t){return at(Z,e,t)},showTooltip({message:e,triggerRect:t,variant:i}){Z.open=!0,Z.message=e,Z.triggerRect=t,Z.variant=i},hide(){Z.open=!1,Z.message="",Z.triggerRect={width:0,height:0,top:0,left:0}}},Y=Pt(ni),Ut={isUnsupportedChainView(){return w.state.view==="UnsupportedChain"||w.state.view==="SwitchNetwork"&&w.state.history.includes("UnsupportedChain")},async safeClose(){if(this.isUnsupportedChainView()){L.shake();return}if(await $t.isSIWXCloseDisabled()){L.shake();return}(w.state.view==="DataCapture"||w.state.view==="DataCaptureOtpConfirm")&&j.disconnect(),L.close()}},Dt={interpolate(e,t,i){if(e.length!==2||t.length!==2)throw new Error("inputRange and outputRange must be an array of length 2");const a=e[0]||0,r=e[1]||0,o=t[0]||0,n=t[1]||0;return i<a?o:i>r?n:(n-o)/(r-a)*(i-a)+o}},si=S`
  :host {
    display: block;
    border-radius: clamp(0px, ${({borderRadius:e})=>e[8]}, 44px);
    box-shadow: 0 0 0 1px ${({tokens:e})=>e.theme.foregroundPrimary};
    overflow: hidden;
  }
`;var ci=function(e,t,i,a){var r=arguments.length,o=r<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};let st=class extends T{render(){return c`<slot></slot>`}};st.styles=[ee,si],st=ci([x("wui-card")],st);const li=S`
  :host {
    width: 100%;
  }

  :host > wui-flex {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${({spacing:e})=>e[2]};
    padding: ${({spacing:e})=>e[3]};
    border-radius: ${({borderRadius:e})=>e[6]};
    border: 1px solid ${({tokens:e})=>e.theme.borderPrimary};
    box-sizing: border-box;
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    box-shadow: 0px 0px 16px 0px rgba(0, 0, 0, 0.25);
    color: ${({tokens:e})=>e.theme.textPrimary};
  }

  :host > wui-flex[data-type='info'] {
    .icon-box {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};

      wui-icon {
        color: ${({tokens:e})=>e.theme.iconDefault};
      }
    }
  }
  :host > wui-flex[data-type='success'] {
    .icon-box {
      background-color: ${({tokens:e})=>e.core.backgroundSuccess};

      wui-icon {
        color: ${({tokens:e})=>e.core.borderSuccess};
      }
    }
  }
  :host > wui-flex[data-type='warning'] {
    .icon-box {
      background-color: ${({tokens:e})=>e.core.backgroundWarning};

      wui-icon {
        color: ${({tokens:e})=>e.core.borderWarning};
      }
    }
  }
  :host > wui-flex[data-type='error'] {
    .icon-box {
      background-color: ${({tokens:e})=>e.core.backgroundError};

      wui-icon {
        color: ${({tokens:e})=>e.core.borderError};
      }
    }
  }

  wui-flex {
    width: 100%;
  }

  wui-text {
    word-break: break-word;
    flex: 1;
  }

  .close {
    cursor: pointer;
    color: ${({tokens:e})=>e.theme.iconDefault};
  }

  .icon-box {
    height: 40px;
    width: 40px;
    border-radius: ${({borderRadius:e})=>e[2]};
    background-color: var(--local-icon-bg-value);
  }
`;var ct=function(e,t,i,a){var r=arguments.length,o=r<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};const di={info:"info",success:"checkmark",warning:"warningCircle",error:"warning"};let Ne=class extends T{constructor(){super(...arguments),this.message="",this.type="info"}render(){return c`
      <wui-flex
        data-type=${A(this.type)}
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        gap="2"
      >
        <wui-flex columnGap="2" flexDirection="row" alignItems="center">
          <wui-flex
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            class="icon-box"
          >
            <wui-icon color="inherit" size="md" name=${di[this.type]}></wui-icon>
          </wui-flex>
          <wui-text variant="md-medium" color="inherit" data-testid="wui-alertbar-text"
            >${this.message}</wui-text
          >
        </wui-flex>
        <wui-icon
          class="close"
          color="inherit"
          size="sm"
          name="close"
          @click=${this.onClose}
        ></wui-icon>
      </wui-flex>
    `}onClose(){Ce.close()}};Ne.styles=[ee,li],ct([u()],Ne.prototype,"message",void 0),ct([u()],Ne.prototype,"type",void 0),Ne=ct([x("wui-alertbar")],Ne);const ui=S`
  :host {
    display: block;
    position: absolute;
    top: ${({spacing:e})=>e[3]};
    left: ${({spacing:e})=>e[4]};
    right: ${({spacing:e})=>e[4]};
    opacity: 0;
    pointer-events: none;
  }
`;var Lt=function(e,t,i,a){var r=arguments.length,o=r<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};const pi={info:{backgroundColor:"fg-350",iconColor:"fg-325",icon:"info"},success:{backgroundColor:"success-glass-reown-020",iconColor:"success-125",icon:"checkmark"},warning:{backgroundColor:"warning-glass-reown-020",iconColor:"warning-100",icon:"warningCircle"},error:{backgroundColor:"error-glass-reown-020",iconColor:"error-125",icon:"warning"}};let He=class extends T{constructor(){super(),this.unsubscribe=[],this.open=Ce.state.open,this.onOpen(!0),this.unsubscribe.push(Ce.subscribeKey("open",e=>{this.open=e,this.onOpen(!1)}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){const{message:e,variant:t}=Ce.state,i=pi[t];return c`
      <wui-alertbar
        message=${e}
        backgroundColor=${i==null?void 0:i.backgroundColor}
        iconColor=${i==null?void 0:i.iconColor}
        icon=${i==null?void 0:i.icon}
        type=${t}
      ></wui-alertbar>
    `}onOpen(e){this.open?(this.animate([{opacity:0,transform:"scale(0.85)"},{opacity:1,transform:"scale(1)"}],{duration:150,fill:"forwards",easing:"ease"}),this.style.cssText="pointer-events: auto"):e||(this.animate([{opacity:1,transform:"scale(1)"},{opacity:0,transform:"scale(0.85)"}],{duration:150,fill:"forwards",easing:"ease"}),this.style.cssText="pointer-events: none")}};He.styles=ui,Lt([h()],He.prototype,"open",void 0),He=Lt([x("w3m-alertbar")],He);const hi=S`
  :host {
    position: relative;
  }

  button {
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: transparent;
    padding: ${({spacing:e})=>e[1]};
  }

  /* -- Colors --------------------------------------------------- */
  button[data-type='accent'] wui-icon {
    color: ${({tokens:e})=>e.core.iconAccentPrimary};
  }

  button[data-type='neutral'][data-variant='primary'] wui-icon {
    color: ${({tokens:e})=>e.theme.iconInverse};
  }

  button[data-type='neutral'][data-variant='secondary'] wui-icon {
    color: ${({tokens:e})=>e.theme.iconDefault};
  }

  button[data-type='success'] wui-icon {
    color: ${({tokens:e})=>e.core.iconSuccess};
  }

  button[data-type='error'] wui-icon {
    color: ${({tokens:e})=>e.core.iconError};
  }

  /* -- Sizes --------------------------------------------------- */
  button[data-size='xs'] {
    width: 16px;
    height: 16px;

    border-radius: ${({borderRadius:e})=>e[1]};
  }

  button[data-size='sm'] {
    width: 20px;
    height: 20px;
    border-radius: ${({borderRadius:e})=>e[1]};
  }

  button[data-size='md'] {
    width: 24px;
    height: 24px;
    border-radius: ${({borderRadius:e})=>e[2]};
  }

  button[data-size='lg'] {
    width: 28px;
    height: 28px;
    border-radius: ${({borderRadius:e})=>e[2]};
  }

  button[data-size='xs'] wui-icon {
    width: 8px;
    height: 8px;
  }

  button[data-size='sm'] wui-icon {
    width: 12px;
    height: 12px;
  }

  button[data-size='md'] wui-icon {
    width: 16px;
    height: 16px;
  }

  button[data-size='lg'] wui-icon {
    width: 20px;
    height: 20px;
  }

  /* -- Hover --------------------------------------------------- */
  @media (hover: hover) {
    button[data-type='accent']:hover:enabled {
      background-color: ${({tokens:e})=>e.core.foregroundAccent010};
    }

    button[data-variant='primary'][data-type='neutral']:hover:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }

    button[data-variant='secondary'][data-type='neutral']:hover:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }

    button[data-type='success']:hover:enabled {
      background-color: ${({tokens:e})=>e.core.backgroundSuccess};
    }

    button[data-type='error']:hover:enabled {
      background-color: ${({tokens:e})=>e.core.backgroundError};
    }
  }

  /* -- Focus --------------------------------------------------- */
  button:focus-visible {
    box-shadow: 0 0 0 4px ${({tokens:e})=>e.core.foregroundAccent020};
  }

  /* -- Properties --------------------------------------------------- */
  button[data-full-width='true'] {
    width: 100%;
  }

  :host([fullWidth]) {
    width: 100%;
  }

  button[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;var ue=function(e,t,i,a){var r=arguments.length,o=r<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};let te=class extends T{constructor(){super(...arguments),this.icon="card",this.variant="primary",this.type="accent",this.size="md",this.iconSize=void 0,this.fullWidth=!1,this.disabled=!1}render(){return c`<button
      data-variant=${this.variant}
      data-type=${this.type}
      data-size=${this.size}
      data-full-width=${this.fullWidth}
      ?disabled=${this.disabled}
    >
      <wui-icon color="inherit" name=${this.icon} size=${A(this.iconSize)}></wui-icon>
    </button>`}};te.styles=[ee,Fe,hi],ue([u()],te.prototype,"icon",void 0),ue([u()],te.prototype,"variant",void 0),ue([u()],te.prototype,"type",void 0),ue([u()],te.prototype,"size",void 0),ue([u()],te.prototype,"iconSize",void 0),ue([u({type:Boolean})],te.prototype,"fullWidth",void 0),ue([u({type:Boolean})],te.prototype,"disabled",void 0),te=ue([x("wui-icon-button")],te);const mi=S`
  button {
    display: block;
    display: flex;
    align-items: center;
    padding: ${({spacing:e})=>e[1]};
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color;
    border-radius: ${({borderRadius:e})=>e[32]};
  }

  wui-image {
    border-radius: 100%;
  }

  wui-text {
    padding-left: ${({spacing:e})=>e[1]};
  }

  .left-icon-container,
  .right-icon-container {
    width: 24px;
    height: 24px;
    justify-content: center;
    align-items: center;
  }

  wui-icon {
    color: ${({tokens:e})=>e.theme.iconDefault};
  }

  /* -- Sizes --------------------------------------------------- */
  button[data-size='lg'] {
    height: 32px;
  }

  button[data-size='md'] {
    height: 28px;
  }

  button[data-size='sm'] {
    height: 24px;
  }

  button[data-size='lg'] wui-image {
    width: 24px;
    height: 24px;
  }

  button[data-size='md'] wui-image {
    width: 20px;
    height: 20px;
  }

  button[data-size='sm'] wui-image {
    width: 16px;
    height: 16px;
  }

  button[data-size='lg'] .left-icon-container {
    width: 24px;
    height: 24px;
  }

  button[data-size='md'] .left-icon-container {
    width: 20px;
    height: 20px;
  }

  button[data-size='sm'] .left-icon-container {
    width: 16px;
    height: 16px;
  }

  /* -- Variants --------------------------------------------------------- */
  button[data-type='filled-dropdown'] {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  button[data-type='text-dropdown'] {
    background-color: transparent;
  }

  /* -- Focus states --------------------------------------------------- */
  button:focus-visible:enabled {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    box-shadow: 0 0 0 4px ${({tokens:e})=>e.core.foregroundAccent040};
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  @media (hover: hover) and (pointer: fine) {
    button:hover:enabled,
    button:active:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
  }

  /* -- Disabled states --------------------------------------------------- */
  button:disabled {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    opacity: 0.5;
  }
`;var ke=function(e,t,i,a){var r=arguments.length,o=r<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};const wi={lg:"lg-regular",md:"md-regular",sm:"sm-regular"},gi={lg:"lg",md:"md",sm:"sm"};let pe=class extends T{constructor(){super(...arguments),this.imageSrc="",this.text="",this.size="lg",this.type="text-dropdown",this.disabled=!1}render(){return c`<button ?disabled=${this.disabled} data-size=${this.size} data-type=${this.type}>
      ${this.imageTemplate()} ${this.textTemplate()}
      <wui-flex class="right-icon-container">
        <wui-icon name="chevronBottom"></wui-icon>
      </wui-flex>
    </button>`}textTemplate(){const e=wi[this.size];return this.text?c`<wui-text color="primary" variant=${e}>${this.text}</wui-text>`:null}imageTemplate(){if(this.imageSrc)return c`<wui-image src=${this.imageSrc} alt="select visual"></wui-image>`;const e=gi[this.size];return c` <wui-flex class="left-icon-container">
      <wui-icon size=${e} name="networkPlaceholder"></wui-icon>
    </wui-flex>`}};pe.styles=[ee,Fe,mi],ke([u()],pe.prototype,"imageSrc",void 0),ke([u()],pe.prototype,"text",void 0),ke([u()],pe.prototype,"size",void 0),ke([u()],pe.prototype,"type",void 0),ke([u({type:Boolean})],pe.prototype,"disabled",void 0),pe=ke([x("wui-select")],pe);const fe={ACCOUNT_TABS:[{label:"Tokens"},{label:"Activity"}],VIEW_DIRECTION:{Next:"next",Prev:"prev"},ANIMATION_DURATIONS:{HeaderText:120},VIEWS_WITH_LEGAL_FOOTER:["Connect","ConnectWallets","OnRampTokenSelect","OnRampFiatSelect","OnRampProviders"],VIEWS_WITH_DEFAULT_FOOTER:["Networks"]},yi=S`
  button {
    background-color: transparent;
    padding: ${({spacing:e})=>e[1]};
  }

  button:focus-visible {
    box-shadow: 0 0 0 4px ${({tokens:e})=>e.core.foregroundAccent020};
  }

  button[data-variant='accent']:hover:enabled,
  button[data-variant='accent']:focus-visible {
    background-color: ${({tokens:e})=>e.core.foregroundAccent010};
  }

  button[data-variant='primary']:hover:enabled,
  button[data-variant='primary']:focus-visible,
  button[data-variant='secondary']:hover:enabled,
  button[data-variant='secondary']:focus-visible {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
  }

  button[data-size='xs'] > wui-icon {
    width: 8px;
    height: 8px;
  }

  button[data-size='sm'] > wui-icon {
    width: 12px;
    height: 12px;
  }

  button[data-size='xs'],
  button[data-size='sm'] {
    border-radius: ${({borderRadius:e})=>e[1]};
  }

  button[data-size='md'],
  button[data-size='lg'] {
    border-radius: ${({borderRadius:e})=>e[2]};
  }

  button[data-size='md'] > wui-icon {
    width: 16px;
    height: 16px;
  }

  button[data-size='lg'] > wui-icon {
    width: 20px;
    height: 20px;
  }

  button:disabled {
    background-color: transparent;
    cursor: not-allowed;
    opacity: 0.5;
  }

  button:hover:not(:disabled) {
    background-color: var(--wui-color-accent-glass-015);
  }

  button:focus-visible:not(:disabled) {
    background-color: var(--wui-color-accent-glass-015);
    box-shadow:
      inset 0 0 0 1px var(--wui-color-accent-100),
      0 0 0 4px var(--wui-color-accent-glass-020);
  }
`;var xe=function(e,t,i,a){var r=arguments.length,o=r<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};let he=class extends T{constructor(){super(...arguments),this.size="md",this.disabled=!1,this.icon="copy",this.iconColor="default",this.variant="accent"}render(){const e={accent:"accent-primary",primary:"inverse",secondary:"default"};return c`
      <button data-variant=${this.variant} ?disabled=${this.disabled} data-size=${this.size}>
        <wui-icon
          color=${e[this.variant]||this.iconColor}
          size=${this.size}
          name=${this.icon}
        ></wui-icon>
      </button>
    `}};he.styles=[ee,Fe,yi],xe([u()],he.prototype,"size",void 0),xe([u({type:Boolean})],he.prototype,"disabled",void 0),xe([u()],he.prototype,"icon",void 0),xe([u()],he.prototype,"iconColor",void 0),xe([u()],he.prototype,"variant",void 0),he=xe([x("wui-icon-link")],he);const fi=Nt`<svg width="86" height="96" fill="none">
  <path
    d="M78.3244 18.926L50.1808 2.45078C45.7376 -0.150261 40.2624 -0.150262 35.8192 2.45078L7.6756 18.926C3.23322 21.5266 0.5 26.3301 0.5 31.5248V64.4752C0.5 69.6699 3.23322 74.4734 7.6756 77.074L35.8192 93.5492C40.2624 96.1503 45.7376 96.1503 50.1808 93.5492L78.3244 77.074C82.7668 74.4734 85.5 69.6699 85.5 64.4752V31.5248C85.5 26.3301 82.7668 21.5266 78.3244 18.926Z"
  />
</svg>`,bi=Nt`
  <svg fill="none" viewBox="0 0 36 40">
    <path
      d="M15.4 2.1a5.21 5.21 0 0 1 5.2 0l11.61 6.7a5.21 5.21 0 0 1 2.61 4.52v13.4c0 1.87-1 3.59-2.6 4.52l-11.61 6.7c-1.62.93-3.6.93-5.22 0l-11.6-6.7a5.21 5.21 0 0 1-2.61-4.51v-13.4c0-1.87 1-3.6 2.6-4.52L15.4 2.1Z"
    />
  </svg>
`,vi=S`
  :host {
    position: relative;
    border-radius: inherit;
    display: flex;
    justify-content: center;
    align-items: center;
    width: var(--local-width);
    height: var(--local-height);
  }

  :host([data-round='true']) {
    background: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: 100%;
    outline: 1px solid ${({tokens:e})=>e.core.glass010};
  }

  svg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
  }

  svg > path {
    stroke: var(--local-stroke);
  }

  wui-image {
    width: 100%;
    height: 100%;
    -webkit-clip-path: var(--local-path);
    clip-path: var(--local-path);
    background: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  wui-icon {
    transform: translateY(-5%);
    width: var(--local-icon-size);
    height: var(--local-icon-size);
  }
`;var be=function(e,t,i,a){var r=arguments.length,o=r<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};let se=class extends T{constructor(){super(...arguments),this.size="md",this.name="uknown",this.networkImagesBySize={sm:bi,md:ai,lg:fi},this.selected=!1,this.round=!1}render(){const e={sm:"4",md:"6",lg:"10"};return this.round?(this.dataset.round="true",this.style.cssText=`
      --local-width: var(--apkt-spacing-10);
      --local-height: var(--apkt-spacing-10);
      --local-icon-size: var(--apkt-spacing-4);
    `):this.style.cssText=`

      --local-path: var(--apkt-path-network-${this.size});
      --local-width:  var(--apkt-width-network-${this.size});
      --local-height:  var(--apkt-height-network-${this.size});
      --local-icon-size:  var(--apkt-spacing-${e[this.size]});
    `,c`${this.templateVisual()} ${this.svgTemplate()} `}svgTemplate(){return this.round?null:this.networkImagesBySize[this.size]}templateVisual(){return this.imageSrc?c`<wui-image src=${this.imageSrc} alt=${this.name}></wui-image>`:c`<wui-icon size="inherit" color="default" name="networkPlaceholder"></wui-icon>`}};se.styles=[ee,vi],be([u()],se.prototype,"size",void 0),be([u()],se.prototype,"name",void 0),be([u({type:Object})],se.prototype,"networkImagesBySize",void 0),be([u()],se.prototype,"imageSrc",void 0),be([u({type:Boolean})],se.prototype,"selected",void 0),be([u({type:Boolean})],se.prototype,"round",void 0),se=be([x("wui-network-image")],se);const ki=S`
  :host {
    position: relative;
    display: flex;
    width: 100%;
    height: 1px;
    background-color: ${({tokens:e})=>e.theme.borderPrimary};
    justify-content: center;
    align-items: center;
  }

  :host > wui-text {
    position: absolute;
    padding: 0px 8px;
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color;
  }

  :host([data-bg-color='primary']) > wui-text {
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
  }

  :host([data-bg-color='secondary']) > wui-text {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }
`;var lt=function(e,t,i,a){var r=arguments.length,o=r<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};let Re=class extends T{constructor(){super(...arguments),this.text="",this.bgColor="primary"}render(){return this.dataset.bgColor=this.bgColor,c`${this.template()}`}template(){return this.text?c`<wui-text variant="md-regular" color="secondary">${this.text}</wui-text>`:null}};Re.styles=[ee,ki],lt([u()],Re.prototype,"text",void 0),lt([u()],Re.prototype,"bgColor",void 0),Re=lt([x("wui-separator")],Re);const f={INVALID_PAYMENT_CONFIG:"INVALID_PAYMENT_CONFIG",INVALID_RECIPIENT:"INVALID_RECIPIENT",INVALID_ASSET:"INVALID_ASSET",INVALID_AMOUNT:"INVALID_AMOUNT",UNKNOWN_ERROR:"UNKNOWN_ERROR",UNABLE_TO_INITIATE_PAYMENT:"UNABLE_TO_INITIATE_PAYMENT",INVALID_CHAIN_NAMESPACE:"INVALID_CHAIN_NAMESPACE",GENERIC_PAYMENT_ERROR:"GENERIC_PAYMENT_ERROR",UNABLE_TO_GET_EXCHANGES:"UNABLE_TO_GET_EXCHANGES",ASSET_NOT_SUPPORTED:"ASSET_NOT_SUPPORTED",UNABLE_TO_GET_PAY_URL:"UNABLE_TO_GET_PAY_URL",UNABLE_TO_GET_BUY_STATUS:"UNABLE_TO_GET_BUY_STATUS",UNABLE_TO_GET_TOKEN_BALANCES:"UNABLE_TO_GET_TOKEN_BALANCES",UNABLE_TO_GET_QUOTE:"UNABLE_TO_GET_QUOTE",UNABLE_TO_GET_QUOTE_STATUS:"UNABLE_TO_GET_QUOTE_STATUS",INVALID_RECIPIENT_ADDRESS_FOR_ASSET:"INVALID_RECIPIENT_ADDRESS_FOR_ASSET"},me={[f.INVALID_PAYMENT_CONFIG]:"Invalid payment configuration",[f.INVALID_RECIPIENT]:"Invalid recipient address",[f.INVALID_ASSET]:"Invalid asset specified",[f.INVALID_AMOUNT]:"Invalid payment amount",[f.INVALID_RECIPIENT_ADDRESS_FOR_ASSET]:"Invalid recipient address for the asset selected",[f.UNKNOWN_ERROR]:"Unknown payment error occurred",[f.UNABLE_TO_INITIATE_PAYMENT]:"Unable to initiate payment",[f.INVALID_CHAIN_NAMESPACE]:"Invalid chain namespace",[f.GENERIC_PAYMENT_ERROR]:"Unable to process payment",[f.UNABLE_TO_GET_EXCHANGES]:"Unable to get exchanges",[f.ASSET_NOT_SUPPORTED]:"Asset not supported by the selected exchange",[f.UNABLE_TO_GET_PAY_URL]:"Unable to get payment URL",[f.UNABLE_TO_GET_BUY_STATUS]:"Unable to get buy status",[f.UNABLE_TO_GET_TOKEN_BALANCES]:"Unable to get token balances",[f.UNABLE_TO_GET_QUOTE]:"Unable to get quote. Please choose a different token",[f.UNABLE_TO_GET_QUOTE_STATUS]:"Unable to get quote status"};class v extends Error{get message(){return me[this.code]}constructor(t,i){super(me[t]),this.name="AppKitPayError",this.code=t,this.details=i,Error.captureStackTrace&&Error.captureStackTrace(this,v)}}const xi="https://rpc.walletconnect.org/v1/json-rpc",Wt="reown_test";function Ti(){const{chainNamespace:e}=R.parseCaipNetworkId(p.state.paymentAsset.network);if(!H.isAddress(p.state.recipient,e))throw new v(f.INVALID_RECIPIENT_ADDRESS_FOR_ASSET,`Provide valid recipient address for namespace "${e}"`)}async function Ai(e,t,i){var n,s,m;if(t!==C.CHAIN.EVM)throw new v(f.INVALID_CHAIN_NAMESPACE);if(!i.fromAddress)throw new v(f.INVALID_PAYMENT_CONFIG,"fromAddress is required for native EVM payments.");const a=typeof i.amount=="string"?parseFloat(i.amount):i.amount;if(isNaN(a))throw new v(f.INVALID_PAYMENT_CONFIG);const r=(s=(n=e.metadata)==null?void 0:n.decimals)!=null?s:18,o=j.parseUnits(a.toString(),r);if(typeof o!="bigint")throw new v(f.GENERIC_PAYMENT_ERROR);return(m=await j.sendTransaction({chainNamespace:t,to:i.recipient,address:i.fromAddress,value:o,data:"0x"}))!=null?m:void 0}async function Si(e,t){var n;if(!t.fromAddress)throw new v(f.INVALID_PAYMENT_CONFIG,"fromAddress is required for ERC20 EVM payments.");const i=e.asset,a=t.recipient,r=Number(e.metadata.decimals),o=j.parseUnits(t.amount.toString(),r);if(o===void 0)throw new v(f.GENERIC_PAYMENT_ERROR);return(n=await j.writeContract({fromAddress:t.fromAddress,tokenAddress:i,args:[a,o],method:"transfer",abi:Zt.getERC20Abi(i),chainNamespace:C.CHAIN.EVM}))!=null?n:void 0}async function Ii(e,t){if(e!==C.CHAIN.SOLANA)throw new v(f.INVALID_CHAIN_NAMESPACE);if(!t.fromAddress)throw new v(f.INVALID_PAYMENT_CONFIG,"fromAddress is required for Solana payments.");const i=typeof t.amount=="string"?parseFloat(t.amount):t.amount;if(isNaN(i)||i<=0)throw new v(f.INVALID_PAYMENT_CONFIG,"Invalid payment amount.");try{if(!Xt.getProvider(e))throw new v(f.GENERIC_PAYMENT_ERROR,"No Solana provider available.");const a=await j.sendTransaction({chainNamespace:C.CHAIN.SOLANA,to:t.recipient,value:i,tokenMint:t.tokenMint});if(!a)throw new v(f.GENERIC_PAYMENT_ERROR,"Transaction failed.");return a}catch(a){throw a instanceof v?a:new v(f.GENERIC_PAYMENT_ERROR,`Solana payment failed: ${a}`)}}async function Ei({sourceToken:e,toToken:t,amount:i,recipient:a}){var n,s,m;const r=j.parseUnits(i,e.metadata.decimals),o=j.parseUnits(i,t.metadata.decimals);return Promise.resolve({type:yt,origin:{amount:(n=r==null?void 0:r.toString())!=null?n:"0",currency:e},destination:{amount:(s=o==null?void 0:o.toString())!=null?s:"0",currency:t},fees:[{id:"service",label:"Service Fee",amount:"0",currency:t}],steps:[{requestId:yt,type:"deposit",deposit:{amount:(m=r==null?void 0:r.toString())!=null?m:"0",currency:e.asset,receiver:a}}],timeInSeconds:6})}function dt(e){if(!e)return null;const t=e.steps[0];return!t||t.type!==ji?null:t}function ut(e,t=0){if(!e)return[];const i=e.steps.filter(r=>r.type===Fi),a=i.filter((r,o)=>o+1>t);return i.length>0&&i.length<3?a:[]}const pt=new Jt({baseUrl:H.getApiUrl(),clientId:null});class Pi extends Error{}function Ci(){const e=P.getSnapshot().projectId;return`${xi}?projectId=${e}`}function ht(){const{projectId:e,sdkType:t,sdkVersion:i}=P.state;return{projectId:e,st:t||"appkit",sv:i||"html-wagmi-4.2.2"}}async function mt(e,t){const i=Ci(),{sdkType:a,sdkVersion:r,projectId:o}=P.getSnapshot(),n={jsonrpc:"2.0",id:1,method:e,params:{...t||{},st:a,sv:r,projectId:o}},s=await(await fetch(i,{method:"POST",body:JSON.stringify(n),headers:{"Content-Type":"application/json"}})).json();if(s.error)throw new Pi(s.error.message);return s}async function zt(e){return(await mt("reown_getExchanges",e)).result}async function Bt(e){return(await mt("reown_getExchangePayUrl",e)).result}async function $i(e){return(await mt("reown_getExchangeBuyStatus",e)).result}async function Ni(e){const t=k.bigNumber(e.amount).times(10**e.toToken.metadata.decimals).toString(),{chainId:i,chainNamespace:a}=R.parseCaipNetworkId(e.sourceToken.network),{chainId:r,chainNamespace:o}=R.parseCaipNetworkId(e.toToken.network),n=e.sourceToken.asset==="native"?Rt(a):e.sourceToken.asset,s=e.toToken.asset==="native"?Rt(o):e.toToken.asset;return await pt.post({path:"/appkit/v1/transfers/quote",body:{user:e.address,originChainId:i.toString(),originCurrency:n,destinationChainId:r.toString(),destinationCurrency:s,recipient:e.recipient,amount:t},params:ht()})}async function Ri(e){const t=X.isLowerCaseMatch(e.sourceToken.network,e.toToken.network),i=X.isLowerCaseMatch(e.sourceToken.asset,e.toToken.asset);return t&&i?Ei(e):Ni(e)}async function Oi(e){return await pt.get({path:"/appkit/v1/transfers/status",params:{requestId:e.requestId,...ht()}})}async function _i(e){return await pt.get({path:`/appkit/v1/transfers/assets/exchanges/${e}`,params:ht()})}const Ui=["eip155","solana"],Di={eip155:{native:{assetNamespace:"slip44",assetReference:"60"},defaultTokenNamespace:"erc20"},solana:{native:{assetNamespace:"slip44",assetReference:"501"},defaultTokenNamespace:"token"}};function wt(e,t){const{chainNamespace:i,chainId:a}=R.parseCaipNetworkId(e),r=Di[i];if(!r)throw new Error(`Unsupported chain namespace for CAIP-19 formatting: ${i}`);let o=r.native.assetNamespace,n=r.native.assetReference;return t!=="native"&&(o=r.defaultTokenNamespace,n=t),`${`${i}:${a}`}/${o}:${n}`}function Li(e){const{chainNamespace:t}=R.parseCaipNetworkId(e);return Ui.includes(t)}function Wi(e){const t=g.getAllRequestedCaipNetworks().find(a=>a.caipNetworkId===e.chainId);let i=e.address;if(!t)throw new Error(`Target network not found for balance chainId "${e.chainId}"`);if(X.isLowerCaseMatch(e.symbol,t.nativeCurrency.symbol))i="native";else if(H.isCaipAddress(i)){const{address:a}=R.parseCaipAddress(i);i=a}else if(!i)throw new Error(`Balance address not found for balance symbol "${e.symbol}"`);return{network:t.caipNetworkId,asset:i,metadata:{name:e.name,symbol:e.symbol,decimals:Number(e.quantity.decimals),logoURI:e.iconUrl},amount:e.quantity.numeric}}function zi(e){return{chainId:e.network,address:`${e.network}:${e.asset}`,symbol:e.metadata.symbol,name:e.metadata.name,iconUrl:e.metadata.logoURI||"",price:0,quantity:{numeric:"0",decimals:e.metadata.decimals.toString()}}}function Ye(e){const t=k.bigNumber(e,{safe:!0});return t.lt(.001)?"<0.001":t.round(4).toString()}function Bi(e){const t=g.getAllRequestedCaipNetworks().find(i=>i.caipNetworkId===e.network);return t?!!t.testnet:!1}const jt=0,gt="unknown",yt="direct-transfer",ji="deposit",Fi="transaction",d=nt({paymentAsset:{network:"eip155:1",asset:"0x0",metadata:{name:"0x0",symbol:"0x0",decimals:0}},recipient:"0x0",amount:0,isConfigured:!1,error:null,isPaymentInProgress:!1,exchanges:[],isLoading:!1,openInNewTab:!0,redirectUrl:void 0,payWithExchange:void 0,currentPayment:void 0,analyticsSet:!1,paymentId:void 0,choice:"pay",tokenBalances:{[C.CHAIN.EVM]:[],[C.CHAIN.SOLANA]:[]},isFetchingTokenBalances:!1,selectedPaymentAsset:null,quote:void 0,quoteStatus:"waiting",quoteError:null,isFetchingQuote:!1,selectedExchange:void 0,exchangeUrlForQuote:void 0,requestId:void 0}),p={state:d,subscribe(e){return rt(d,()=>e(d))},subscribeKey(e,t){return at(d,e,t)},async handleOpenPay(e){this.resetState(),this.setPaymentConfig(e),this.initializeAnalytics(),Ti(),await this.prepareTokenLogo(),d.isConfigured=!0,q.sendEvent({type:"track",event:"PAY_MODAL_OPEN",properties:{exchanges:d.exchanges,configuration:{network:d.paymentAsset.network,asset:d.paymentAsset.asset,recipient:d.recipient,amount:d.amount}}}),await L.open({view:"Pay"})},resetState(){d.paymentAsset={network:"eip155:1",asset:"0x0",metadata:{name:"0x0",symbol:"0x0",decimals:0}},d.recipient="0x0",d.amount=0,d.isConfigured=!1,d.error=null,d.isPaymentInProgress=!1,d.isLoading=!1,d.currentPayment=void 0,d.selectedExchange=void 0,d.exchangeUrlForQuote=void 0,d.requestId=void 0},resetQuoteState(){d.quote=void 0,d.quoteStatus="waiting",d.quoteError=null,d.isFetchingQuote=!1,d.requestId=void 0},setPaymentConfig(e){var t,i;if(!e.paymentAsset)throw new v(f.INVALID_PAYMENT_CONFIG);try{d.choice=(t=e.choice)!=null?t:"pay",d.paymentAsset=e.paymentAsset,d.recipient=e.recipient,d.amount=e.amount,d.openInNewTab=(i=e.openInNewTab)!=null?i:!0,d.redirectUrl=e.redirectUrl,d.payWithExchange=e.payWithExchange,d.error=null}catch(a){throw new v(f.INVALID_PAYMENT_CONFIG,a.message)}},setSelectedPaymentAsset(e){d.selectedPaymentAsset=e},setSelectedExchange(e){d.selectedExchange=e},setRequestId(e){d.requestId=e},setPaymentInProgress(e){d.isPaymentInProgress=e},getPaymentAsset(){return d.paymentAsset},getExchanges(){return d.exchanges},async fetchExchanges(){try{d.isLoading=!0;const e=await zt({page:jt});d.exchanges=e.exchanges.slice(0,2)}catch{throw I.showError(me.UNABLE_TO_GET_EXCHANGES),new v(f.UNABLE_TO_GET_EXCHANGES)}finally{d.isLoading=!1}},async getAvailableExchanges(e){var t,i;try{const a=e!=null&&e.asset&&(e!=null&&e.network)?wt(e.network,e.asset):void 0;return await zt({page:(t=e==null?void 0:e.page)!=null?t:jt,asset:a,amount:(i=e==null?void 0:e.amount)==null?void 0:i.toString()})}catch{throw new v(f.UNABLE_TO_GET_EXCHANGES)}},async getPayUrl(e,t,i=!1){try{const a=Number(t.amount),r=await Bt({exchangeId:e,asset:wt(t.network,t.asset),amount:a.toString(),recipient:`${t.network}:${t.recipient}`});return q.sendEvent({type:"track",event:"PAY_EXCHANGE_SELECTED",properties:{source:"pay",exchange:{id:e},configuration:{network:t.network,asset:t.asset,recipient:t.recipient,amount:a},currentPayment:{type:"exchange",exchangeId:e},headless:i}}),i&&(this.initiatePayment(),q.sendEvent({type:"track",event:"PAY_INITIATED",properties:{source:"pay",paymentId:d.paymentId||gt,configuration:{network:t.network,asset:t.asset,recipient:t.recipient,amount:a},currentPayment:{type:"exchange",exchangeId:e}}})),r}catch(a){throw a instanceof Error&&a.message.includes("is not supported")?new v(f.ASSET_NOT_SUPPORTED):new Error(a.message)}},async generateExchangeUrlForQuote({exchangeId:e,paymentAsset:t,amount:i,recipient:a}){const r=await Bt({exchangeId:e,asset:wt(t.network,t.asset),amount:i.toString(),recipient:a});d.exchangeSessionId=r.sessionId,d.exchangeUrlForQuote=r.url},async openPayUrl(e,t,i=!1){var a;try{const r=await this.getPayUrl(e.exchangeId,t,i);if(!r)throw new v(f.UNABLE_TO_GET_PAY_URL);const o=(a=e.openInNewTab)==null||a?"_blank":"_self";return H.openHref(r.url,o),r}catch(r){throw r instanceof v?d.error=r.message:d.error=me.GENERIC_PAYMENT_ERROR,new v(f.UNABLE_TO_GET_PAY_URL)}},async onTransfer({chainNamespace:e,fromAddress:t,toAddress:i,amount:a,paymentAsset:r}){if(d.currentPayment={type:"wallet",status:"IN_PROGRESS"},!d.isPaymentInProgress)try{this.initiatePayment();const o=g.getAllRequestedCaipNetworks().find(s=>s.caipNetworkId===r.network);if(!o)throw new Error("Target network not found");const n=g.state.activeCaipNetwork;switch(X.isLowerCaseMatch(n==null?void 0:n.caipNetworkId,o.caipNetworkId)||await g.switchActiveNetwork(o),e){case C.CHAIN.EVM:r.asset==="native"&&(d.currentPayment.result=await Ai(r,e,{recipient:i,amount:a,fromAddress:t})),r.asset.startsWith("0x")&&(d.currentPayment.result=await Si(r,{recipient:i,amount:a,fromAddress:t})),d.currentPayment.status="SUCCESS";break;case C.CHAIN.SOLANA:d.currentPayment.result=await Ii(e,{recipient:i,amount:a,fromAddress:t,tokenMint:r.asset==="native"?void 0:r.asset}),d.currentPayment.status="SUCCESS";break;default:throw new v(f.INVALID_CHAIN_NAMESPACE)}}catch(o){throw o instanceof v?d.error=o.message:d.error=me.GENERIC_PAYMENT_ERROR,d.currentPayment.status="FAILED",I.showError(d.error),o}finally{d.isPaymentInProgress=!1}},async onSendTransaction(e){try{const{namespace:t,transactionStep:i}=e;p.initiatePayment();const a=g.getAllRequestedCaipNetworks().find(o=>{var n;return o.caipNetworkId===((n=d.paymentAsset)==null?void 0:n.network)});if(!a)throw new Error("Target network not found");const r=g.state.activeCaipNetwork;if(X.isLowerCaseMatch(r==null?void 0:r.caipNetworkId,a.caipNetworkId)||await g.switchActiveNetwork(a),t===C.CHAIN.EVM){const{from:o,to:n,data:s,value:m}=i.transaction;await j.sendTransaction({address:o,to:n,data:s,value:BigInt(m),chainNamespace:t})}else if(t===C.CHAIN.SOLANA){const{instructions:o}=i.transaction;await j.writeSolanaTransaction({instructions:o})}}catch(t){throw t instanceof v?d.error=t.message:d.error=me.GENERIC_PAYMENT_ERROR,I.showError(d.error),t}finally{d.isPaymentInProgress=!1}},getExchangeById(e){return d.exchanges.find(t=>t.id===e)},validatePayConfig(e){const{paymentAsset:t,recipient:i,amount:a}=e;if(!t)throw new v(f.INVALID_PAYMENT_CONFIG);if(!i)throw new v(f.INVALID_RECIPIENT);if(!t.asset)throw new v(f.INVALID_ASSET);if(a==null||a<=0)throw new v(f.INVALID_AMOUNT)},async handlePayWithExchange(e){try{d.currentPayment={type:"exchange",exchangeId:e};const{network:t,asset:i}=d.paymentAsset,a={network:t,asset:i,amount:d.amount,recipient:d.recipient},r=await this.getPayUrl(e,a);if(!r)throw new v(f.UNABLE_TO_INITIATE_PAYMENT);return d.currentPayment.sessionId=r.sessionId,d.currentPayment.status="IN_PROGRESS",d.currentPayment.exchangeId=e,this.initiatePayment(),{url:r.url,openInNewTab:d.openInNewTab}}catch(t){return t instanceof v?d.error=t.message:d.error=me.GENERIC_PAYMENT_ERROR,d.isPaymentInProgress=!1,I.showError(d.error),null}},async getBuyStatus(e,t){var i,a;try{const r=await $i({sessionId:t,exchangeId:e});return(r.status==="SUCCESS"||r.status==="FAILED")&&q.sendEvent({type:"track",event:r.status==="SUCCESS"?"PAY_SUCCESS":"PAY_ERROR",properties:{message:r.status==="FAILED"?H.parseError(d.error):void 0,source:"pay",paymentId:d.paymentId||gt,configuration:{network:d.paymentAsset.network,asset:d.paymentAsset.asset,recipient:d.recipient,amount:d.amount},currentPayment:{type:"exchange",exchangeId:(i=d.currentPayment)==null?void 0:i.exchangeId,sessionId:(a=d.currentPayment)==null?void 0:a.sessionId,result:r.txHash}}}),r}catch{throw new v(f.UNABLE_TO_GET_BUY_STATUS)}},async fetchTokensFromEOA({caipAddress:e,caipNetwork:t,namespace:i}){if(!e)return[];const{address:a}=R.parseCaipAddress(e);let r=t;return i===C.CHAIN.EVM&&(r=void 0),await Ct.getMyTokensWithBalance({address:a,caipNetwork:r})},async fetchTokensFromExchange(){if(!d.selectedExchange)return[];const e=await _i(d.selectedExchange.id),t=Object.values(e.assets).flat();return await Promise.all(t.map(async i=>{const a=zi(i),{chainNamespace:r}=R.parseCaipNetworkId(a.chainId);let o=a.address;if(H.isCaipAddress(o)){const{address:s}=R.parseCaipAddress(o);o=s}const n=await M.getImageByToken(o!=null?o:"",r).catch(()=>{});return a.iconUrl=n!=null?n:"",a}))},async fetchTokens({caipAddress:e,caipNetwork:t,namespace:i}){try{d.isFetchingTokenBalances=!0;const a=await(d.selectedExchange?this.fetchTokensFromExchange():this.fetchTokensFromEOA({caipAddress:e,caipNetwork:t,namespace:i}));d.tokenBalances={...d.tokenBalances,[i]:a}}catch(a){const r=a instanceof Error?a.message:"Unable to get token balances";I.showError(r)}finally{d.isFetchingTokenBalances=!1}},async fetchQuote({amount:e,address:t,sourceToken:i,toToken:a,recipient:r}){var o;try{p.resetQuoteState(),d.isFetchingQuote=!0;const n=await Ri({amount:e,address:d.selectedExchange?void 0:t,sourceToken:i,toToken:a,recipient:r});if(d.selectedExchange){const s=dt(n);if(s){const m=`${i.network}:${s.deposit.receiver}`,b=k.formatNumber(s.deposit.amount,{decimals:(o=i.metadata.decimals)!=null?o:0,round:8});await p.generateExchangeUrlForQuote({exchangeId:d.selectedExchange.id,paymentAsset:i,amount:b.toString(),recipient:m})}}d.quote=n}catch(n){let s=me.UNABLE_TO_GET_QUOTE;if(n instanceof Error&&n.cause&&n.cause instanceof Response)try{const m=await n.cause.json();m.error&&typeof m.error=="string"&&(s=m.error)}catch{}throw d.quoteError=s,I.showError(s),new v(f.UNABLE_TO_GET_QUOTE)}finally{d.isFetchingQuote=!1}},async fetchQuoteStatus({requestId:e}){try{if(e===yt){const i=d.selectedExchange,a=d.exchangeSessionId;if(i&&a){switch((await this.getBuyStatus(i.id,a)).status){case"IN_PROGRESS":d.quoteStatus="waiting";break;case"SUCCESS":d.quoteStatus="success",d.isPaymentInProgress=!1;break;case"FAILED":d.quoteStatus="failure",d.isPaymentInProgress=!1;break;case"UNKNOWN":d.quoteStatus="waiting";break;default:d.quoteStatus="waiting";break}return}d.quoteStatus="success";return}const{status:t}=await Oi({requestId:e});d.quoteStatus=t}catch{throw d.quoteStatus="failure",new v(f.UNABLE_TO_GET_QUOTE_STATUS)}},initiatePayment(){d.isPaymentInProgress=!0,d.paymentId=crypto.randomUUID()},initializeAnalytics(){d.analyticsSet||(d.analyticsSet=!0,this.subscribeKey("isPaymentInProgress",e=>{var t;if((t=d.currentPayment)!=null&&t.status&&d.currentPayment.status!=="UNKNOWN"){const i={IN_PROGRESS:"PAY_INITIATED",SUCCESS:"PAY_SUCCESS",FAILED:"PAY_ERROR"}[d.currentPayment.status];q.sendEvent({type:"track",event:i,properties:{message:d.currentPayment.status==="FAILED"?H.parseError(d.error):void 0,source:"pay",paymentId:d.paymentId||gt,configuration:{network:d.paymentAsset.network,asset:d.paymentAsset.asset,recipient:d.recipient,amount:d.amount},currentPayment:{type:d.currentPayment.type,exchangeId:d.currentPayment.exchangeId,sessionId:d.currentPayment.sessionId,result:d.currentPayment.result}}})}}))},async prepareTokenLogo(){if(!d.paymentAsset.metadata.logoURI)try{const{chainNamespace:e}=R.parseCaipNetworkId(d.paymentAsset.network),t=await M.getImageByToken(d.paymentAsset.asset,e);d.paymentAsset.metadata.logoURI=t}catch{}}},qi=S`
  wui-separator {
    margin: var(--apkt-spacing-3) calc(var(--apkt-spacing-3) * -1) var(--apkt-spacing-2)
      calc(var(--apkt-spacing-3) * -1);
    width: calc(100% + var(--apkt-spacing-3) * 2);
  }

  .token-display {
    padding: var(--apkt-spacing-3) var(--apkt-spacing-3);
    border-radius: var(--apkt-borderRadius-5);
    background-color: var(--apkt-tokens-theme-backgroundPrimary);
    margin-top: var(--apkt-spacing-3);
    margin-bottom: var(--apkt-spacing-3);
  }

  .token-display wui-text {
    text-transform: none;
  }

  wui-loading-spinner {
    padding: var(--apkt-spacing-2);
  }

  .left-image-container {
    position: relative;
    justify-content: center;
    align-items: center;
  }

  .token-image {
    border-radius: ${({borderRadius:e})=>e.round};
    width: 40px;
    height: 40px;
  }

  .chain-image {
    position: absolute;
    width: 20px;
    height: 20px;
    bottom: -3px;
    right: -5px;
    border-radius: ${({borderRadius:e})=>e.round};
    border: 2px solid ${({tokens:e})=>e.theme.backgroundPrimary};
  }

  .payment-methods-container {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-top-right-radius: ${({borderRadius:e})=>e[8]};
    border-top-left-radius: ${({borderRadius:e})=>e[8]};
  }
`;var we=function(e,t,i,a){var r=arguments.length,o=r<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};let ie=class extends T{constructor(){super(),this.unsubscribe=[],this.amount=p.state.amount,this.namespace=void 0,this.paymentAsset=p.state.paymentAsset,this.activeConnectorIds=z.state.activeConnectorIds,this.caipAddress=void 0,this.exchanges=p.state.exchanges,this.isLoading=p.state.isLoading,this.initializeNamespace(),this.unsubscribe.push(p.subscribeKey("amount",e=>this.amount=e)),this.unsubscribe.push(z.subscribeKey("activeConnectorIds",e=>this.activeConnectorIds=e)),this.unsubscribe.push(p.subscribeKey("exchanges",e=>this.exchanges=e)),this.unsubscribe.push(p.subscribeKey("isLoading",e=>this.isLoading=e)),p.fetchExchanges(),p.setSelectedExchange(void 0)}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return c`
      <wui-flex flexDirection="column">
        ${this.paymentDetailsTemplate()} ${this.paymentMethodsTemplate()}
      </wui-flex>
    `}paymentMethodsTemplate(){return c`
      <wui-flex flexDirection="column" padding="3" gap="2" class="payment-methods-container">
        ${this.payWithWalletTemplate()} ${this.templateSeparator()}
        ${this.templateExchangeOptions()}
      </wui-flex>
    `}initializeNamespace(){var t;const e=g.state.activeChain;this.namespace=e,this.caipAddress=(t=g.getAccountData(e))==null?void 0:t.caipAddress,this.unsubscribe.push(g.subscribeChainProp("accountState",i=>{this.caipAddress=i==null?void 0:i.caipAddress},e))}paymentDetailsTemplate(){const e=g.getAllRequestedCaipNetworks().find(t=>t.caipNetworkId===this.paymentAsset.network);return c`
      <wui-flex
        alignItems="center"
        justifyContent="space-between"
        .padding=${["6","8","6","8"]}
        gap="2"
      >
        <wui-flex alignItems="center" gap="1">
          <wui-text variant="h1-regular" color="primary">
            ${Ye(this.amount||"0")}
          </wui-text>

          <wui-flex flexDirection="column">
            <wui-text variant="h6-regular" color="secondary">
              ${this.paymentAsset.metadata.symbol||"Unknown"}
            </wui-text>
            <wui-text variant="md-medium" color="secondary"
              >on ${(e==null?void 0:e.name)||"Unknown"}</wui-text
            >
          </wui-flex>
        </wui-flex>

        <wui-flex class="left-image-container">
          <wui-image
            src=${A(this.paymentAsset.metadata.logoURI)}
            class="token-image"
          ></wui-image>
          <wui-image
            src=${A(M.getNetworkImage(e))}
            class="chain-image"
          ></wui-image>
        </wui-flex>
      </wui-flex>
    `}payWithWalletTemplate(){return Li(this.paymentAsset.network)?this.caipAddress?this.connectedWalletTemplate():this.disconnectedWalletTemplate():c``}connectedWalletTemplate(){const{name:e,image:t}=this.getWalletProperties({namespace:this.namespace});return c`
      <wui-flex flexDirection="column" gap="3">
        <wui-list-item
          type="secondary"
          boxColor="foregroundSecondary"
          @click=${this.onWalletPayment}
          .boxed=${!1}
          ?chevron=${!0}
          ?fullSize=${!1}
          ?rounded=${!0}
          data-testid="wallet-payment-option"
          imageSrc=${A(t)}
          imageSize="3xl"
        >
          <wui-text variant="lg-regular" color="primary">Pay with ${e}</wui-text>
        </wui-list-item>

        <wui-list-item
          type="secondary"
          icon="power"
          iconColor="error"
          @click=${this.onDisconnect}
          data-testid="disconnect-button"
          ?chevron=${!1}
          boxColor="foregroundSecondary"
        >
          <wui-text variant="lg-regular" color="secondary">Disconnect</wui-text>
        </wui-list-item>
      </wui-flex>
    `}disconnectedWalletTemplate(){return c`<wui-list-item
      type="secondary"
      boxColor="foregroundSecondary"
      variant="icon"
      iconColor="default"
      iconVariant="overlay"
      icon="wallet"
      @click=${this.onWalletPayment}
      ?chevron=${!0}
      data-testid="wallet-payment-option"
    >
      <wui-text variant="lg-regular" color="primary">Pay with wallet</wui-text>
    </wui-list-item>`}templateExchangeOptions(){if(this.isLoading)return c`<wui-flex justifyContent="center" alignItems="center">
        <wui-loading-spinner size="md"></wui-loading-spinner>
      </wui-flex>`;const e=this.exchanges.filter(t=>Bi(this.paymentAsset)?t.id===Wt:t.id!==Wt);return e.length===0?c`<wui-flex justifyContent="center" alignItems="center">
        <wui-text variant="md-medium" color="primary">No exchanges available</wui-text>
      </wui-flex>`:e.map(t=>c`
        <wui-list-item
          type="secondary"
          boxColor="foregroundSecondary"
          @click=${()=>this.onExchangePayment(t)}
          data-testid="exchange-option-${t.id}"
          ?chevron=${!0}
          imageSrc=${A(t.imageUrl)}
        >
          <wui-text flexGrow="1" variant="lg-regular" color="primary">
            Pay with ${t.name}
          </wui-text>
        </wui-list-item>
      `)}templateSeparator(){return c`<wui-separator text="or" bgColor="secondary"></wui-separator>`}async onWalletPayment(){if(!this.namespace)throw new Error("Namespace not found");this.caipAddress?w.push("PayQuote"):(await z.connect(),await L.open({view:"PayQuote"}))}onExchangePayment(e){p.setSelectedExchange(e),w.push("PayQuote")}async onDisconnect(){try{await j.disconnect(),await L.open({view:"Pay"})}catch{console.error("Failed to disconnect"),I.showError("Failed to disconnect")}}getWalletProperties({namespace:e}){if(!e)return{name:void 0,image:void 0};const t=this.activeConnectorIds[e];if(!t)return{name:void 0,image:void 0};const i=z.getConnector({id:t,namespace:e});if(!i)return{name:void 0,image:void 0};const a=M.getConnectorImage(i);return{name:i.name,image:a}}};ie.styles=qi,we([h()],ie.prototype,"amount",void 0),we([h()],ie.prototype,"namespace",void 0),we([h()],ie.prototype,"paymentAsset",void 0),we([h()],ie.prototype,"activeConnectorIds",void 0),we([h()],ie.prototype,"caipAddress",void 0),we([h()],ie.prototype,"exchanges",void 0),we([h()],ie.prototype,"isLoading",void 0),ie=we([x("w3m-pay-view")],ie);const Mi=S`
  :host {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .pulse-container {
    position: relative;
    width: var(--pulse-size);
    height: var(--pulse-size);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .pulse-rings {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .pulse-ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 2px solid var(--pulse-color);
    opacity: 0;
    animation: pulse var(--pulse-duration, 2s) ease-out infinite;
  }

  .pulse-content {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  @keyframes pulse {
    0% {
      transform: scale(0.5);
      opacity: var(--pulse-opacity, 0.3);
    }
    50% {
      opacity: calc(var(--pulse-opacity, 0.3) * 0.5);
    }
    100% {
      transform: scale(1.2);
      opacity: 0;
    }
  }
`;var Te=function(e,t,i,a){var r=arguments.length,o=r<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};const Vi=3,Gi=2,Hi=.3,Yi="200px",Ki={"accent-primary":$e.tokens.core.backgroundAccentPrimary};let ge=class extends T{constructor(){super(...arguments),this.rings=Vi,this.duration=Gi,this.opacity=Hi,this.size=Yi,this.variant="accent-primary"}render(){const e=Ki[this.variant];this.style.cssText=`
      --pulse-size: ${this.size};
      --pulse-duration: ${this.duration}s;
      --pulse-color: ${e};
      --pulse-opacity: ${this.opacity};
    `;const t=Array.from({length:this.rings},(i,a)=>this.renderRing(a,this.rings));return c`
      <div class="pulse-container">
        <div class="pulse-rings">${t}</div>
        <div class="pulse-content">
          <slot></slot>
        </div>
      </div>
    `}renderRing(e,t){const i=`animation-delay: ${e/t*this.duration}s;`;return c`<div class="pulse-ring" style=${i}></div>`}};ge.styles=[ee,Mi],Te([u({type:Number})],ge.prototype,"rings",void 0),Te([u({type:Number})],ge.prototype,"duration",void 0),Te([u({type:Number})],ge.prototype,"opacity",void 0),Te([u()],ge.prototype,"size",void 0),Te([u()],ge.prototype,"variant",void 0),ge=Te([x("wui-pulse")],ge);const Ft=[{id:"received",title:"Receiving funds",icon:"dollar"},{id:"processing",title:"Swapping asset",icon:"recycleHorizontal"},{id:"sending",title:"Sending asset to the recipient address",icon:"send"}],qt=["success","submitted","failure","timeout","refund"],Qi=S`
  :host {
    display: block;
    height: 100%;
    width: 100%;
  }

  wui-image {
    border-radius: ${({borderRadius:e})=>e.round};
  }

  .token-badge-container {
    position: absolute;
    bottom: 6px;
    left: 50%;
    transform: translateX(-50%);
    border-radius: ${({borderRadius:e})=>e[4]};
    z-index: 3;
    min-width: 105px;
  }

  .token-badge-container.loading {
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    border: 3px solid ${({tokens:e})=>e.theme.backgroundPrimary};
  }

  .token-badge-container.success {
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    border: 3px solid ${({tokens:e})=>e.theme.backgroundPrimary};
  }

  .token-image-container {
    position: relative;
  }

  .token-image {
    border-radius: ${({borderRadius:e})=>e.round};
    width: 64px;
    height: 64px;
  }

  .token-image.success {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  .token-image.error {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  .token-image.loading {
    background: ${({colors:e})=>e.accent010};
  }

  .token-image wui-icon {
    width: 32px;
    height: 32px;
  }

  .token-badge {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border: 1px solid ${({tokens:e})=>e.theme.foregroundSecondary};
    border-radius: ${({borderRadius:e})=>e[4]};
  }

  .token-badge wui-text {
    white-space: nowrap;
  }

  .payment-lifecycle-container {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-top-right-radius: ${({borderRadius:e})=>e[6]};
    border-top-left-radius: ${({borderRadius:e})=>e[6]};
  }

  .payment-step-badge {
    padding: ${({spacing:e})=>e[1]} ${({spacing:e})=>e[2]};
    border-radius: ${({borderRadius:e})=>e[1]};
  }

  .payment-step-badge.loading {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
  }

  .payment-step-badge.error {
    background-color: ${({tokens:e})=>e.core.backgroundError};
  }

  .payment-step-badge.success {
    background-color: ${({tokens:e})=>e.core.backgroundSuccess};
  }

  .step-icon-container {
    position: relative;
    height: 40px;
    width: 40px;
    border-radius: ${({borderRadius:e})=>e.round};
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
  }

  .step-icon-box {
    position: absolute;
    right: -4px;
    bottom: -1px;
    padding: 2px;
    border-radius: ${({borderRadius:e})=>e.round};
    border: 2px solid ${({tokens:e})=>e.theme.backgroundPrimary};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  .step-icon-box.success {
    background-color: ${({tokens:e})=>e.core.backgroundSuccess};
  }
`;var oe=function(e,t,i,a){var r=arguments.length,o=r<3?t:a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};const Xi={received:["pending","success","submitted"],processing:["success","submitted"],sending:["success","submitted"]},Zi=3e3;let K=class extends T{constructor(){super(),this.unsubscribe=[],this.pollingInterval=null,this.paymentAsset=p.state.paymentAsset,this.quoteStatus=p.state.quoteStatus,this.quote=p.state.quote,this.amount=p.state.amount,this.namespace=void 0,this.caipAddress=void 0,this.profileName=null,this.activeConnectorIds=z.state.activeConnectorIds,this.selectedExchange=p.state.selectedExchange,this.initializeNamespace(),this.unsubscribe.push(p.subscribeKey("quoteStatus",e=>this.quoteStatus=e),p.subscribeKey("quote",e=>this.quote=e),z.subscribeKey("activeConnectorIds",e=>this.activeConnectorIds=e),p.subscribeKey("selectedExchange",e=>this.selectedExchange=e))}connectedCallback(){super.connectedCallback(),this.startPolling()}disconnectedCallback(){super.disconnectedCallback(),this.stopPolling(),this.unsubscribe.forEach(e=>e())}render(){return c`
      <wui-flex flexDirection="column" .padding=${["3","0","0","0"]} gap="2">
        ${this.tokenTemplate()} ${this.paymentTemplate()} ${this.paymentLifecycleTemplate()}
      </wui-flex>
    `}tokenTemplate(){var r;const e=Ye(this.amount||"0"),t=(r=this.paymentAsset.metadata.symbol)!=null?r:"Unknown",i=g.getAllRequestedCaipNetworks().find(o=>o.caipNetworkId===this.paymentAsset.network),a=this.quoteStatus==="failure"||this.quoteStatus==="timeout"||this.quoteStatus==="refund";return this.quoteStatus==="success"||this.quoteStatus==="submitted"?c`<wui-flex alignItems="center" justifyContent="center">
        <wui-flex justifyContent="center" alignItems="center" class="token-image success">
          <wui-icon name="checkmark" color="success" size="inherit"></wui-icon>
        </wui-flex>
      </wui-flex>`:a?c`<wui-flex alignItems="center" justifyContent="center">
        <wui-flex justifyContent="center" alignItems="center" class="token-image error">
          <wui-icon name="close" color="error" size="inherit"></wui-icon>
        </wui-flex>
      </wui-flex>`:c`
      <wui-flex alignItems="center" justifyContent="center">
        <wui-flex class="token-image-container">
          <wui-pulse size="125px" rings="3" duration="4" opacity="0.5" variant="accent-primary">
            <wui-flex justifyContent="center" alignItems="center" class="token-image loading">
              <wui-icon name="paperPlaneTitle" color="accent-primary" size="inherit"></wui-icon>
            </wui-flex>
          </wui-pulse>

          <wui-flex
            justifyContent="center"
            alignItems="center"
            class="token-badge-container loading"
          >
            <wui-flex
              alignItems="center"
              justifyContent="center"
              gap="01"
              padding="1"
              class="token-badge"
            >
              <wui-image
                src=${A(M.getNetworkImage(i))}
                class="chain-image"
                size="mdl"
              ></wui-image>

              <wui-text variant="lg-regular" color="primary">${e} ${t}</wui-text>
            </wui-flex>
          </wui-flex>
        </wui-flex>
      </wui-flex>
    `}paymentTemplate(){return c`
      <wui-flex flexDirection="column" gap="2" .padding=${["0","6","0","6"]}>
        ${this.renderPayment()}
        <wui-separator></wui-separator>
        ${this.renderWallet()}
      </wui-flex>
    `}paymentLifecycleTemplate(){const e=this.getStepsWithStatus();return c`
      <wui-flex flexDirection="column" padding="4" gap="2" class="payment-lifecycle-container">
        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="md-regular" color="secondary">PAYMENT CYCLE</wui-text>

          ${this.renderPaymentCycleBadge()}
        </wui-flex>

        <wui-flex flexDirection="column" gap="5" .padding=${["2","0","2","0"]}>
          ${e.map(t=>this.renderStep(t))}
        </wui-flex>
      </wui-flex>
    `}renderPaymentCycleBadge(){var a,r;const e=this.quoteStatus==="failure"||this.quoteStatus==="timeout"||this.quoteStatus==="refund",t=this.quoteStatus==="success"||this.quoteStatus==="submitted";if(e)return c`
        <wui-flex
          justifyContent="center"
          alignItems="center"
          class="payment-step-badge error"
          gap="1"
        >
          <wui-icon name="close" color="error" size="xs"></wui-icon>
          <wui-text variant="sm-regular" color="error">Failed</wui-text>
        </wui-flex>
      `;if(t)return c`
        <wui-flex
          justifyContent="center"
          alignItems="center"
          class="payment-step-badge success"
          gap="1"
        >
          <wui-icon name="checkmark" color="success" size="xs"></wui-icon>
          <wui-text variant="sm-regular" color="success">Completed</wui-text>
        </wui-flex>
      `;const i=(r=(a=this.quote)==null?void 0:a.timeInSeconds)!=null?r:0;return c`
      <wui-flex alignItems="center" justifyContent="space-between" gap="3">
        <wui-flex
          justifyContent="center"
          alignItems="center"
          class="payment-step-badge loading"
          gap="1"
        >
          <wui-icon name="clock" color="default" size="xs"></wui-icon>
          <wui-text variant="sm-regular" color="primary">Est. ${i} sec</wui-text>
        </wui-flex>

        <wui-icon name="chevronBottom" color="default" size="xxs"></wui-icon>
      </wui-flex>
    `}renderPayment(){var r,o,n,s,m;const e=g.getAllRequestedCaipNetworks().find(b=>{var _;const E=(_=this.quote)==null?void 0:_.origin.currency.network;if(!E)return!1;const{chainId:D}=R.parseCaipNetworkId(E);return X.isLowerCaseMatch(b.id.toString(),D.toString())}),t=k.formatNumber(((r=this.quote)==null?void 0:r.origin.amount)||"0",{decimals:(n=(o=this.quote)==null?void 0:o.origin.currency.metadata.decimals)!=null?n:0}).toString(),i=Ye(t),a=(m=(s=this.quote)==null?void 0:s.origin.currency.metadata.symbol)!=null?m:"Unknown";return c`
      <wui-flex
        alignItems="flex-start"
        justifyContent="space-between"
        .padding=${["3","0","3","0"]}
      >
        <wui-text variant="lg-regular" color="secondary">Payment Method</wui-text>

        <wui-flex flexDirection="column" alignItems="flex-end" gap="1">
          <wui-flex alignItems="center" gap="01">
            <wui-text variant="lg-regular" color="primary">${i}</wui-text>
            <wui-text variant="lg-regular" color="secondary">${a}</wui-text>
          </wui-flex>

          <wui-flex alignItems="center" gap="1">
            <wui-text variant="md-regular" color="secondary">on</wui-text>
            <wui-image
              src=${A(M.getNetworkImage(e))}
              size="xs"
            ></wui-image>
            <wui-text variant="md-regular" color="secondary">${e==null?void 0:e.name}</wui-text>
          </wui-flex>
        </wui-flex>
      </wui-flex>
    `}renderWallet(){return c`
      <wui-flex
        alignItems="flex-start"
        justifyContent="space-between"
        .padding=${["3","0","3","0"]}
      >
        <wui-text variant="lg-regular" color="secondary">Wallet</wui-text>

        ${this.renderWalletText()}
      </wui-flex>
    `}renderWalletText(){var a;const{image:e}=this.getWalletProperties({namespace:this.namespace}),{address:t}=this.caipAddress?R.parseCaipAddress(this.caipAddress):{},i=(a=this.selectedExchange)==null?void 0:a.name;return this.selectedExchange?c`
        <wui-flex alignItems="center" justifyContent="flex-end" gap="1">
          <wui-text variant="lg-regular" color="primary">${i}</wui-text>
          <wui-image src=${A(this.selectedExchange.imageUrl)} size="mdl"></wui-image>
        </wui-flex>
      `:c`
      <wui-flex alignItems="center" justifyContent="flex-end" gap="1">
        <wui-text variant="lg-regular" color="primary">
          ${Ve.getTruncateString({string:this.profileName||t||i||"",charsStart:this.profileName?16:4,charsEnd:this.profileName?0:6,truncate:this.profileName?"end":"middle"})}
        </wui-text>

        <wui-image src=${A(e)} size="mdl"></wui-image>
      </wui-flex>
    `}getStepsWithStatus(){return this.quoteStatus==="failure"||this.quoteStatus==="timeout"||this.quoteStatus==="refund"?Ft.map(e=>({...e,status:"failed"})):Ft.map(e=>{var i;const t=((i=Xi[e.id])!=null?i:[]).includes(this.quoteStatus)?"completed":"pending";return{...e,status:t}})}renderStep({title:e,icon:t,status:i}){return c`
      <wui-flex alignItems="center" gap="3">
        <wui-flex justifyContent="center" alignItems="center" class="step-icon-container">
          <wui-icon name=${t} color="default" size="mdl"></wui-icon>

          <wui-flex alignItems="center" justifyContent="center" class=${Ot({"step-icon-box":!0,success:i==="completed"})}>
            ${this.renderStatusIndicator(i)}
          </wui-flex>
        </wui-flex>

        <wui-text variant="md-regular" color="primary">${e}</wui-text>
      </wui-flex>
    `}renderStatusIndicator(e){return e==="completed"?c`<wui-icon size="sm" color="success" name="checkmark"></wui-icon>`:e==="failed"?c`<wui-icon size="sm" color="error" name="close"></wui-icon>`:e==="pending"?c`<wui-loading-spinner color="accent-primary" size="sm"></wui-loading-spinner>`:null}startPolling(){this.pollingInterval||(this.fetchQuoteStatus(),this.pollingInterval=setInterval(()=>{this.fetchQuoteStatus()},Zi))}stopPolling(){this.pollingInterval&&(clearInterval(this.pollingInterval),this.pollingInterval=null)}async fetchQuoteStatus(){const e=p.state.requestId;if(!e||qt.includes(this.quoteStatus))this.stopPolling();else try{await p.fetchQuoteStatus({requestId:e}),qt.includes(this.quoteStatus)&&this.stopPolling()}catch{this.stopPolling()}}initializeNamespace(){var t,i,a;const e=g.state.activeChain;this.namespace=e,this.caipAddress=(t=g.getAccountData(e))==null?void 0:t.caipAddress,this.profileName=(a=(i=g.getAccountData(e))==null?void 0:i.profileName)!=null?a:null,this.unsubscribe.push(g.subscribeChainProp("accountState",r=>{var o;this.caipAddress=r==null?void 0:r.caipAddress,this.profileName=(o=r==null?void 0:r.profileName)!=null?o:null},e))}getWalletProperties({namespace:e}){if(!e)return{name:void 0,image:void 0};const t=this.activeConnectorIds[e];if(!t)return{name:void 0,image:void 0};const i=z.getConnector({id:t,namespace:e});if(!i)return{name:void 0,image:void 0};const a=M.getConnectorImage(i);return{name:i.name,image:a}}};K.styles=Qi,oe([h()],K.prototype,"paymentAsset",void 0),oe([h()],K.prototype,"quoteStatus",void 0),oe([h()],K.prototype,"quote",void 0),oe([h()],K.prototype,"amount",void 0),oe([h()],K.prototype,"namespace",void 0),oe([h()],K.prototype,"caipAddress",void 0),oe([h()],K.prototype,"profileName",void 0),oe([h()],K.prototype,"activeConnectorIds",void 0),oe([h()],K.prototype,"selectedExchange",void 0),K=oe([x("w3m-pay-loading-view")],K);const Ji=S`
  button {
    display: flex;
    align-items: center;
    height: 40px;
    padding: ${({spacing:e})=>e[2]};
    border-radius: ${({borderRadius:e})=>e[4]};
    column-gap: ${({spacing:e})=>e[1]};
    background-color: transparent;
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color;
  }

  wui-image,
  .icon-box {
    width: ${({spacing:e})=>e[6]};
    height: ${({spacing:e})=>e[6]};
    border-radius: ${({borderRadius:e})=>e[4]};
  }

  wui-text {
    flex: 1;
  }

  .icon-box {
    position: relative;
  }

  .icon-box[data-active='true'] {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
  }

  .circle {
    position: absolute;
    left: 16px;
    top: 15px;
    width: 8px;
    height: 8px;
    background-color: ${({tokens:e})=>e.core.textSuccess};
    box-shadow: 0 0 0 2px ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: 50%;
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  @media (hover: hover) {
    button:hover:enabled,
    button:active:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    }
  }
`;var J=function(e,t,i,a){var r=arguments.length,o=r<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};let V=class extends T{constructor(){super(...arguments),this.address="",this.profileName="",this.alt="",this.imageSrc="",this.icon=void 0,this.iconSize="md",this.enableGreenCircle=!0,this.loading=!1,this.charsStart=4,this.charsEnd=6}render(){return c`
      <button>
        ${this.leftImageTemplate()} ${this.textTemplate()} ${this.rightImageTemplate()}
      </button>
    `}leftImageTemplate(){const e=this.icon?c`<wui-icon
          size=${A(this.iconSize)}
          color="default"
          name=${this.icon}
          class="icon"
        ></wui-icon>`:c`<wui-image src=${this.imageSrc} alt=${this.alt}></wui-image>`;return c`
      <wui-flex
        alignItems="center"
        justifyContent="center"
        class="icon-box"
        data-active=${!!this.icon}
      >
        ${e}
        ${this.enableGreenCircle?c`<wui-flex class="circle"></wui-flex>`:null}
      </wui-flex>
    `}textTemplate(){return c`
      <wui-text variant="lg-regular" color="primary">
        ${Ve.getTruncateString({string:this.profileName||this.address,charsStart:this.profileName?16:this.charsStart,charsEnd:this.profileName?0:this.charsEnd,truncate:this.profileName?"end":"middle"})}
      </wui-text>
    `}rightImageTemplate(){return c`<wui-icon name="chevronBottom" size="sm" color="default"></wui-icon>`}};V.styles=[ee,Fe,Ji],J([u()],V.prototype,"address",void 0),J([u()],V.prototype,"profileName",void 0),J([u()],V.prototype,"alt",void 0),J([u()],V.prototype,"imageSrc",void 0),J([u()],V.prototype,"icon",void 0),J([u()],V.prototype,"iconSize",void 0),J([u({type:Boolean})],V.prototype,"enableGreenCircle",void 0),J([u({type:Boolean})],V.prototype,"loading",void 0),J([u({type:Number})],V.prototype,"charsStart",void 0),J([u({type:Number})],V.prototype,"charsEnd",void 0),V=J([x("wui-wallet-switch")],V);const eo=qe`
  :host {
    display: block;
  }
`;var to=function(e,t,i,a){var r=arguments.length,o=r<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};let ft=class extends T{render(){return c`
      <wui-flex flexDirection="column" gap="4">
        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="md-regular" color="secondary">Pay</wui-text>
          <wui-shimmer width="60px" height="16px" borderRadius="4xs" variant="light"></wui-shimmer>
        </wui-flex>

        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="md-regular" color="secondary">Network Fee</wui-text>

          <wui-flex flexDirection="column" alignItems="flex-end" gap="2">
            <wui-shimmer
              width="75px"
              height="16px"
              borderRadius="4xs"
              variant="light"
            ></wui-shimmer>

            <wui-flex alignItems="center" gap="01">
              <wui-shimmer width="14px" height="14px" rounded variant="light"></wui-shimmer>
              <wui-shimmer
                width="49px"
                height="14px"
                borderRadius="4xs"
                variant="light"
              ></wui-shimmer>
            </wui-flex>
          </wui-flex>
        </wui-flex>

        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="md-regular" color="secondary">Service Fee</wui-text>
          <wui-shimmer width="75px" height="16px" borderRadius="4xs" variant="light"></wui-shimmer>
        </wui-flex>
      </wui-flex>
    `}};ft.styles=[eo],ft=to([x("w3m-pay-fees-skeleton")],ft);const io=S`
  :host {
    display: block;
  }

  wui-image {
    border-radius: ${({borderRadius:e})=>e.round};
  }
`;var Mt=function(e,t,i,a){var r=arguments.length,o=r<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};let Ke=class extends T{constructor(){super(),this.unsubscribe=[],this.quote=p.state.quote,this.unsubscribe.push(p.subscribeKey("quote",e=>this.quote=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){var t,i,a,r;const e=k.formatNumber(((t=this.quote)==null?void 0:t.origin.amount)||"0",{decimals:(a=(i=this.quote)==null?void 0:i.origin.currency.metadata.decimals)!=null?a:0,round:6}).toString();return c`
      <wui-flex flexDirection="column" gap="4">
        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="md-regular" color="secondary">Pay</wui-text>
          <wui-text variant="md-regular" color="primary">
            ${e} ${((r=this.quote)==null?void 0:r.origin.currency.metadata.symbol)||"Unknown"}
          </wui-text>
        </wui-flex>

        ${this.quote&&this.quote.fees.length>0?this.quote.fees.map(o=>this.renderFee(o)):null}
      </wui-flex>
    `}renderFee(e){var a;const t=e.id==="network",i=k.formatNumber(e.amount||"0",{decimals:(a=e.currency.metadata.decimals)!=null?a:0,round:6}).toString();if(t){const r=g.getAllRequestedCaipNetworks().find(o=>X.isLowerCaseMatch(o.caipNetworkId,e.currency.network));return c`
        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="md-regular" color="secondary">${e.label}</wui-text>

          <wui-flex flexDirection="column" alignItems="flex-end" gap="2">
            <wui-text variant="md-regular" color="primary">
              ${i} ${e.currency.metadata.symbol||"Unknown"}
            </wui-text>

            <wui-flex alignItems="center" gap="01">
              <wui-image
                src=${A(M.getNetworkImage(r))}
                size="xs"
              ></wui-image>
              <wui-text variant="sm-regular" color="secondary">
                ${(r==null?void 0:r.name)||"Unknown"}
              </wui-text>
            </wui-flex>
          </wui-flex>
        </wui-flex>
      `}return c`
      <wui-flex alignItems="center" justifyContent="space-between">
        <wui-text variant="md-regular" color="secondary">${e.label}</wui-text>
        <wui-text variant="md-regular" color="primary">
          ${i} ${e.currency.metadata.symbol||"Unknown"}
        </wui-text>
      </wui-flex>
    `}};Ke.styles=[io],Mt([h()],Ke.prototype,"quote",void 0),Ke=Mt([x("w3m-pay-fees")],Ke);const oo=S`
  :host {
    display: block;
    width: 100%;
  }

  .disabled-container {
    padding: ${({spacing:e})=>e[2]};
    min-height: 168px;
  }

  wui-icon {
    width: ${({spacing:e})=>e[8]};
    height: ${({spacing:e})=>e[8]};
  }

  wui-flex > wui-text {
    max-width: 273px;
  }
`;var Vt=function(e,t,i,a){var r=arguments.length,o=r<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};let Qe=class extends T{constructor(){super(),this.unsubscribe=[],this.selectedExchange=p.state.selectedExchange,this.unsubscribe.push(p.subscribeKey("selectedExchange",e=>this.selectedExchange=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){const e=!!this.selectedExchange;return c`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        gap="3"
        class="disabled-container"
      >
        <wui-icon name="coins" color="default" size="inherit"></wui-icon>

        <wui-text variant="md-regular" color="primary" align="center">
          You don't have enough funds to complete this transaction
        </wui-text>

        ${e?null:c`<wui-button
              size="md"
              variant="neutral-secondary"
              @click=${this.dispatchConnectOtherWalletEvent.bind(this)}
              >Connect other wallet</wui-button
            >`}
      </wui-flex>
    `}dispatchConnectOtherWalletEvent(){this.dispatchEvent(new CustomEvent("connectOtherWallet",{detail:!0,bubbles:!0,composed:!0}))}};Qe.styles=[oo],Vt([u({type:Array})],Qe.prototype,"selectedExchange",void 0),Qe=Vt([x("w3m-pay-options-empty")],Qe);const ao=S`
  :host {
    display: block;
    width: 100%;
  }

  .pay-options-container {
    max-height: 196px;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
  }

  .pay-options-container::-webkit-scrollbar {
    display: none;
  }

  .pay-option-container {
    border-radius: ${({borderRadius:e})=>e[4]};
    padding: ${({spacing:e})=>e[3]};
    min-height: 60px;
  }

  .token-images-container {
    position: relative;
    justify-content: center;
    align-items: center;
  }

  .chain-image {
    position: absolute;
    bottom: -3px;
    right: -5px;
    border: 2px solid ${({tokens:e})=>e.theme.foregroundSecondary};
  }
`;var ro=function(e,t,i,a){var r=arguments.length,o=r<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};let bt=class extends T{render(){return c`
      <wui-flex flexDirection="column" gap="2" class="pay-options-container">
        ${this.renderOptionEntry()} ${this.renderOptionEntry()} ${this.renderOptionEntry()}
      </wui-flex>
    `}renderOptionEntry(){return c`
      <wui-flex
        alignItems="center"
        justifyContent="space-between"
        gap="2"
        class="pay-option-container"
      >
        <wui-flex alignItems="center" gap="2">
          <wui-flex class="token-images-container">
            <wui-shimmer
              width="32px"
              height="32px"
              rounded
              variant="light"
              class="token-image"
            ></wui-shimmer>
            <wui-shimmer
              width="16px"
              height="16px"
              rounded
              variant="light"
              class="chain-image"
            ></wui-shimmer>
          </wui-flex>

          <wui-flex flexDirection="column" gap="1">
            <wui-shimmer
              width="74px"
              height="16px"
              borderRadius="4xs"
              variant="light"
            ></wui-shimmer>
            <wui-shimmer
              width="46px"
              height="14px"
              borderRadius="4xs"
              variant="light"
            ></wui-shimmer>
          </wui-flex>
        </wui-flex>
      </wui-flex>
    `}};bt.styles=[ao],bt=ro([x("w3m-pay-options-skeleton")],bt);const no=S`
  :host {
    display: block;
    width: 100%;
  }

  .pay-options-container {
    max-height: 196px;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
    mask-image: var(--options-mask-image);
    -webkit-mask-image: var(--options-mask-image);
  }

  .pay-options-container::-webkit-scrollbar {
    display: none;
  }

  .pay-option-container {
    cursor: pointer;
    border-radius: ${({borderRadius:e})=>e[4]};
    padding: ${({spacing:e})=>e[3]};
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-1"]};
    will-change: background-color;
  }

  .token-images-container {
    position: relative;
    justify-content: center;
    align-items: center;
  }

  .token-image {
    border-radius: ${({borderRadius:e})=>e.round};
    width: 32px;
    height: 32px;
  }

  .chain-image {
    position: absolute;
    width: 16px;
    height: 16px;
    bottom: -3px;
    right: -5px;
    border-radius: ${({borderRadius:e})=>e.round};
    border: 2px solid ${({tokens:e})=>e.theme.backgroundPrimary};
  }

  @media (hover: hover) and (pointer: fine) {
    .pay-option-container:hover {
      background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    }
  }
`;var Xe=function(e,t,i,a){var r=arguments.length,o=r<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};const so=300;let Ae=class extends T{constructor(){super(),this.unsubscribe=[],this.options=[],this.selectedPaymentAsset=null}disconnectedCallback(){var e,t,i;this.unsubscribe.forEach(a=>a()),(e=this.resizeObserver)==null||e.disconnect(),(i=(t=this.shadowRoot)==null?void 0:t.querySelector(".pay-options-container"))==null||i.removeEventListener("scroll",this.handleOptionsListScroll.bind(this))}firstUpdated(){var t,i;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".pay-options-container");e&&(requestAnimationFrame(this.handleOptionsListScroll.bind(this)),e==null||e.addEventListener("scroll",this.handleOptionsListScroll.bind(this)),this.resizeObserver=new ResizeObserver(()=>{this.handleOptionsListScroll()}),(i=this.resizeObserver)==null||i.observe(e),this.handleOptionsListScroll())}render(){return c`
      <wui-flex flexDirection="column" gap="2" class="pay-options-container">
        ${this.options.map(e=>this.payOptionTemplate(e))}
      </wui-flex>
    `}payOptionTemplate(e){var D,_;const{network:t,metadata:i,asset:a,amount:r="0"}=e,o=g.getAllRequestedCaipNetworks().find(F=>F.caipNetworkId===t),n=`${t}:${a}`,s=`${(D=this.selectedPaymentAsset)==null?void 0:D.network}:${(_=this.selectedPaymentAsset)==null?void 0:_.asset}`,m=n===s,b=k.bigNumber(r,{safe:!0}),E=b.gt(0);return c`
      <wui-flex
        alignItems="center"
        justifyContent="space-between"
        gap="2"
        @click=${()=>{var F;return(F=this.onSelect)==null?void 0:F.call(this,e)}}
        class="pay-option-container"
      >
        <wui-flex alignItems="center" gap="2">
          <wui-flex class="token-images-container">
            <wui-image
              src=${A(i.logoURI)}
              class="token-image"
              size="3xl"
            ></wui-image>
            <wui-image
              src=${A(M.getNetworkImage(o))}
              class="chain-image"
              size="md"
            ></wui-image>
          </wui-flex>

          <wui-flex flexDirection="column" gap="1">
            <wui-text variant="lg-regular" color="primary">${i.symbol}</wui-text>
            ${E?c`<wui-text variant="sm-regular" color="secondary">
                  ${b.round(6).toString()} ${i.symbol}
                </wui-text>`:null}
          </wui-flex>
        </wui-flex>

        ${m?c`<wui-icon name="checkmark" size="md" color="success"></wui-icon>`:null}
      </wui-flex>
    `}handleOptionsListScroll(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".pay-options-container");e&&(e.scrollHeight>so?(e.style.setProperty("--options-mask-image",`linear-gradient(
          to bottom,
          rgba(0, 0, 0, calc(1 - var(--options-scroll--top-opacity))) 0px,
          rgba(200, 200, 200, calc(1 - var(--options-scroll--top-opacity))) 1px,
          black 50px,
          black calc(100% - 50px),
          rgba(155, 155, 155, calc(1 - var(--options-scroll--bottom-opacity))) calc(100% - 1px),
          rgba(0, 0, 0, calc(1 - var(--options-scroll--bottom-opacity))) 100%
        )`),e.style.setProperty("--options-scroll--top-opacity",Dt.interpolate([0,50],[0,1],e.scrollTop).toString()),e.style.setProperty("--options-scroll--bottom-opacity",Dt.interpolate([0,50],[0,1],e.scrollHeight-e.scrollTop-e.offsetHeight).toString())):(e.style.setProperty("--options-mask-image","none"),e.style.setProperty("--options-scroll--top-opacity","0"),e.style.setProperty("--options-scroll--bottom-opacity","0")))}};Ae.styles=[no],Xe([u({type:Array})],Ae.prototype,"options",void 0),Xe([u()],Ae.prototype,"selectedPaymentAsset",void 0),Xe([u()],Ae.prototype,"onSelect",void 0),Ae=Xe([x("w3m-pay-options")],Ae);const co=S`
  .payment-methods-container {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-top-right-radius: ${({borderRadius:e})=>e[5]};
    border-top-left-radius: ${({borderRadius:e})=>e[5]};
  }

  .pay-options-container {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    border-radius: ${({borderRadius:e})=>e[5]};
    padding: ${({spacing:e})=>e[1]};
  }

  w3m-tooltip-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    max-width: fit-content;
  }

  wui-image {
    border-radius: ${({borderRadius:e})=>e.round};
  }

  w3m-pay-options.disabled {
    opacity: 0.5;
    pointer-events: none;
  }
`;var O=function(e,t,i,a){var r=arguments.length,o=r<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};const Ze={eip155:"ethereum",solana:"solana",bip122:"bitcoin",ton:"ton"},lo={eip155:{icon:Ze.eip155,label:"EVM"},solana:{icon:Ze.solana,label:"Solana"},bip122:{icon:Ze.bip122,label:"Bitcoin"},ton:{icon:Ze.ton,label:"Ton"}};let $=class extends T{constructor(){super(),this.unsubscribe=[],this.profileName=null,this.paymentAsset=p.state.paymentAsset,this.namespace=void 0,this.caipAddress=void 0,this.amount=p.state.amount,this.recipient=p.state.recipient,this.activeConnectorIds=z.state.activeConnectorIds,this.selectedPaymentAsset=p.state.selectedPaymentAsset,this.selectedExchange=p.state.selectedExchange,this.isFetchingQuote=p.state.isFetchingQuote,this.quoteError=p.state.quoteError,this.quote=p.state.quote,this.isFetchingTokenBalances=p.state.isFetchingTokenBalances,this.tokenBalances=p.state.tokenBalances,this.isPaymentInProgress=p.state.isPaymentInProgress,this.exchangeUrlForQuote=p.state.exchangeUrlForQuote,this.completedTransactionsCount=0,this.unsubscribe.push(p.subscribeKey("paymentAsset",e=>this.paymentAsset=e)),this.unsubscribe.push(p.subscribeKey("tokenBalances",e=>this.onTokenBalancesChanged(e))),this.unsubscribe.push(p.subscribeKey("isFetchingTokenBalances",e=>this.isFetchingTokenBalances=e)),this.unsubscribe.push(z.subscribeKey("activeConnectorIds",e=>this.activeConnectorIds=e)),this.unsubscribe.push(p.subscribeKey("selectedPaymentAsset",e=>this.selectedPaymentAsset=e)),this.unsubscribe.push(p.subscribeKey("isFetchingQuote",e=>this.isFetchingQuote=e)),this.unsubscribe.push(p.subscribeKey("quoteError",e=>this.quoteError=e)),this.unsubscribe.push(p.subscribeKey("quote",e=>this.quote=e)),this.unsubscribe.push(p.subscribeKey("amount",e=>this.amount=e)),this.unsubscribe.push(p.subscribeKey("recipient",e=>this.recipient=e)),this.unsubscribe.push(p.subscribeKey("isPaymentInProgress",e=>this.isPaymentInProgress=e)),this.unsubscribe.push(p.subscribeKey("selectedExchange",e=>this.selectedExchange=e)),this.unsubscribe.push(p.subscribeKey("exchangeUrlForQuote",e=>this.exchangeUrlForQuote=e)),this.resetQuoteState(),this.initializeNamespace(),this.fetchTokens()}disconnectedCallback(){super.disconnectedCallback(),this.resetAssetsState(),this.unsubscribe.forEach(e=>e())}updated(e){super.updated(e),e.has("selectedPaymentAsset")&&this.fetchQuote()}render(){return c`
      <wui-flex flexDirection="column">
        ${this.profileTemplate()}

        <wui-flex
          flexDirection="column"
          gap="4"
          class="payment-methods-container"
          .padding=${["4","4","5","4"]}
        >
          ${this.paymentOptionsViewTemplate()} ${this.amountWithFeeTemplate()}

          <wui-flex
            alignItems="center"
            justifyContent="space-between"
            .padding=${["1","0","1","0"]}
          >
            <wui-separator></wui-separator>
          </wui-flex>

          ${this.paymentActionsTemplate()}
        </wui-flex>
      </wui-flex>
    `}profileTemplate(){var o,n,s,m,b;if(this.selectedExchange){const E=k.formatNumber((o=this.quote)==null?void 0:o.origin.amount,{decimals:(s=(n=this.quote)==null?void 0:n.origin.currency.metadata.decimals)!=null?s:0}).toString();return c`
        <wui-flex
          .padding=${["4","3","4","3"]}
          alignItems="center"
          justifyContent="space-between"
          gap="2"
        >
          <wui-text variant="lg-regular" color="secondary">Paying with</wui-text>

          ${this.quote?c`<wui-text variant="lg-regular" color="primary">
                ${k.bigNumber(E,{safe:!0}).round(6).toString()}
                ${this.quote.origin.currency.metadata.symbol}
              </wui-text>`:c`<wui-shimmer width="80px" height="18px" variant="light"></wui-shimmer>`}
        </wui-flex>
      `}const e=(m=H.getPlainAddress(this.caipAddress))!=null?m:"",{name:t,image:i}=this.getWalletProperties({namespace:this.namespace}),{icon:a,label:r}=(b=lo[this.namespace])!=null?b:{};return c`
      <wui-flex
        .padding=${["4","3","4","3"]}
        alignItems="center"
        justifyContent="space-between"
        gap="2"
      >
        <wui-wallet-switch
          profileName=${A(this.profileName)}
          address=${A(e)}
          imageSrc=${A(i)}
          alt=${A(t)}
          @click=${this.onConnectOtherWallet.bind(this)}
          data-testid="wui-wallet-switch"
        ></wui-wallet-switch>

        <wui-wallet-switch
          profileName=${A(r)}
          address=${A(e)}
          icon=${A(a)}
          iconSize="xs"
          .enableGreenCircle=${!1}
          alt=${A(r)}
          @click=${this.onConnectOtherWallet.bind(this)}
          data-testid="wui-wallet-switch"
        ></wui-wallet-switch>
      </wui-flex>
    `}initializeNamespace(){var t,i,a;const e=g.state.activeChain;this.namespace=e,this.caipAddress=(t=g.getAccountData(e))==null?void 0:t.caipAddress,this.profileName=(a=(i=g.getAccountData(e))==null?void 0:i.profileName)!=null?a:null,this.unsubscribe.push(g.subscribeChainProp("accountState",r=>this.onAccountStateChanged(r),e))}async fetchTokens(){if(this.namespace){let e;if(this.caipAddress){const{chainId:t,chainNamespace:i}=R.parseCaipAddress(this.caipAddress),a=`${i}:${t}`;e=g.getAllRequestedCaipNetworks().find(r=>r.caipNetworkId===a)}await p.fetchTokens({caipAddress:this.caipAddress,caipNetwork:e,namespace:this.namespace})}}fetchQuote(){if(this.amount&&this.recipient&&this.selectedPaymentAsset&&this.paymentAsset){const{address:e}=this.caipAddress?R.parseCaipAddress(this.caipAddress):{};p.fetchQuote({amount:this.amount.toString(),address:e,sourceToken:this.selectedPaymentAsset,toToken:this.paymentAsset,recipient:this.recipient})}}getWalletProperties({namespace:e}){if(!e)return{name:void 0,image:void 0};const t=this.activeConnectorIds[e];if(!t)return{name:void 0,image:void 0};const i=z.getConnector({id:t,namespace:e});if(!i)return{name:void 0,image:void 0};const a=M.getConnectorImage(i);return{name:i.name,image:a}}paymentOptionsViewTemplate(){return c`
      <wui-flex flexDirection="column" gap="2">
        <wui-text variant="sm-regular" color="secondary">CHOOSE PAYMENT OPTION</wui-text>
        <wui-flex class="pay-options-container">${this.paymentOptionsTemplate()}</wui-flex>
      </wui-flex>
    `}paymentOptionsTemplate(){const e=this.getPaymentAssetFromTokenBalances();if(this.isFetchingTokenBalances)return c`<w3m-pay-options-skeleton></w3m-pay-options-skeleton>`;if(e.length===0)return c`<w3m-pay-options-empty
        @connectOtherWallet=${this.onConnectOtherWallet.bind(this)}
      ></w3m-pay-options-empty>`;const t={disabled:this.isFetchingQuote};return c`<w3m-pay-options
      class=${Ot(t)}
      .options=${e}
      .selectedPaymentAsset=${A(this.selectedPaymentAsset)}
      .onSelect=${this.onSelectedPaymentAssetChanged.bind(this)}
    ></w3m-pay-options>`}amountWithFeeTemplate(){return this.isFetchingQuote||!this.selectedPaymentAsset||this.quoteError?c`<w3m-pay-fees-skeleton></w3m-pay-fees-skeleton>`:c`<w3m-pay-fees></w3m-pay-fees>`}paymentActionsTemplate(){var a,r,o,n,s;const e=this.isFetchingQuote||this.isFetchingTokenBalances,t=this.isFetchingQuote||this.isFetchingTokenBalances||!this.selectedPaymentAsset||!!this.quoteError,i=k.formatNumber((r=(a=this.quote)==null?void 0:a.origin.amount)!=null?r:0,{decimals:(n=(o=this.quote)==null?void 0:o.origin.currency.metadata.decimals)!=null?n:0}).toString();return this.selectedExchange?e||t?c`
          <wui-shimmer width="100%" height="48px" variant="light" ?rounded=${!0}></wui-shimmer>
        `:c`<wui-button
        size="lg"
        fullWidth
        variant="accent-secondary"
        @click=${this.onPayWithExchange.bind(this)}
      >
        ${`Continue in ${this.selectedExchange.name}`}

        <wui-icon name="arrowRight" color="inherit" size="sm" slot="iconRight"></wui-icon>
      </wui-button>`:c`
      <wui-flex alignItems="center" justifyContent="space-between">
        <wui-flex flexDirection="column" gap="1">
          <wui-text variant="md-regular" color="secondary">Order Total</wui-text>

          ${e||t?c`<wui-shimmer width="58px" height="32px" variant="light"></wui-shimmer>`:c`<wui-flex alignItems="center" gap="01">
                <wui-text variant="h4-regular" color="primary">${Ye(i)}</wui-text>

                <wui-text variant="lg-regular" color="secondary">
                  ${((s=this.quote)==null?void 0:s.origin.currency.metadata.symbol)||"Unknown"}
                </wui-text>
              </wui-flex>`}
        </wui-flex>

        ${this.actionButtonTemplate({isLoading:e,isDisabled:t})}
      </wui-flex>
    `}actionButtonTemplate(e){const t=ut(this.quote),{isLoading:i,isDisabled:a}=e;let r="Pay";return t.length>1&&this.completedTransactionsCount===0&&(r="Approve"),c`
      <wui-button
        size="lg"
        variant="accent-primary"
        ?loading=${i||this.isPaymentInProgress}
        ?disabled=${a||this.isPaymentInProgress}
        @click=${()=>{t.length>0?this.onSendTransactions():this.onTransfer()}}
      >
        ${r}
        ${i?null:c`<wui-icon
              name="arrowRight"
              color="inherit"
              size="sm"
              slot="iconRight"
            ></wui-icon>`}
      </wui-button>
    `}getPaymentAssetFromTokenBalances(){var e;return this.namespace?((e=this.tokenBalances[this.namespace])!=null?e:[]).map(t=>{try{return Wi(t)}catch{return null}}).filter(t=>!!t).filter(t=>{const{chainId:i}=R.parseCaipNetworkId(t.network),{chainId:a}=R.parseCaipNetworkId(this.paymentAsset.network);return X.isLowerCaseMatch(t.asset,this.paymentAsset.asset)?!0:this.selectedExchange?!X.isLowerCaseMatch(i.toString(),a.toString()):!0}):[]}onTokenBalancesChanged(e){this.tokenBalances=e;const[t]=this.getPaymentAssetFromTokenBalances();t&&p.setSelectedPaymentAsset(t)}async onConnectOtherWallet(){await z.connect(),await L.open({view:"PayQuote"})}onAccountStateChanged(e){var i;const{address:t}=this.caipAddress?R.parseCaipAddress(this.caipAddress):{};if(this.caipAddress=e==null?void 0:e.caipAddress,this.profileName=(i=e==null?void 0:e.profileName)!=null?i:null,t){const{address:a}=this.caipAddress?R.parseCaipAddress(this.caipAddress):{};a?X.isLowerCaseMatch(a,t)||(this.resetAssetsState(),this.resetQuoteState(),this.fetchTokens()):L.close()}}onSelectedPaymentAssetChanged(e){this.isFetchingQuote||p.setSelectedPaymentAsset(e)}async onTransfer(){var t,i,a,r,o;const e=dt(this.quote);if(e){if(!X.isLowerCaseMatch((t=this.selectedPaymentAsset)==null?void 0:t.asset,e.deposit.currency))throw new Error("Quote asset is not the same as the selected payment asset");const n=(a=(i=this.selectedPaymentAsset)==null?void 0:i.amount)!=null?a:"0",s=k.formatNumber(e.deposit.amount,{decimals:(o=(r=this.selectedPaymentAsset)==null?void 0:r.metadata.decimals)!=null?o:0}).toString();if(!k.bigNumber(n).gte(s)){I.showError("Insufficient funds");return}if(this.quote&&this.selectedPaymentAsset&&this.caipAddress&&this.namespace){const{address:m}=R.parseCaipAddress(this.caipAddress);await p.onTransfer({chainNamespace:this.namespace,fromAddress:m,toAddress:e.deposit.receiver,amount:s,paymentAsset:this.selectedPaymentAsset}),p.setRequestId(e.requestId),w.push("PayLoading")}}}async onSendTransactions(){var r,o,n,s,m,b;const e=(o=(r=this.selectedPaymentAsset)==null?void 0:r.amount)!=null?o:"0",t=k.formatNumber((s=(n=this.quote)==null?void 0:n.origin.amount)!=null?s:0,{decimals:(b=(m=this.selectedPaymentAsset)==null?void 0:m.metadata.decimals)!=null?b:0}).toString();if(!k.bigNumber(e).gte(t)){I.showError("Insufficient funds");return}const i=ut(this.quote),[a]=ut(this.quote,this.completedTransactionsCount);a&&this.namespace&&(await p.onSendTransaction({namespace:this.namespace,transactionStep:a}),this.completedTransactionsCount+=1,this.completedTransactionsCount===i.length&&(p.setRequestId(a.requestId),w.push("PayLoading")))}onPayWithExchange(){if(this.exchangeUrlForQuote){const e=H.returnOpenHref("","popupWindow","scrollbar=yes,width=480,height=720");if(!e)throw new Error("Could not create popup window");e.location.href=this.exchangeUrlForQuote;const t=dt(this.quote);t&&p.setRequestId(t.requestId),p.initiatePayment(),w.push("PayLoading")}}resetAssetsState(){p.setSelectedPaymentAsset(null)}resetQuoteState(){p.resetQuoteState()}};$.styles=co,O([h()],$.prototype,"profileName",void 0),O([h()],$.prototype,"paymentAsset",void 0),O([h()],$.prototype,"namespace",void 0),O([h()],$.prototype,"caipAddress",void 0),O([h()],$.prototype,"amount",void 0),O([h()],$.prototype,"recipient",void 0),O([h()],$.prototype,"activeConnectorIds",void 0),O([h()],$.prototype,"selectedPaymentAsset",void 0),O([h()],$.prototype,"selectedExchange",void 0),O([h()],$.prototype,"isFetchingQuote",void 0),O([h()],$.prototype,"quoteError",void 0),O([h()],$.prototype,"quote",void 0),O([h()],$.prototype,"isFetchingTokenBalances",void 0),O([h()],$.prototype,"tokenBalances",void 0),O([h()],$.prototype,"isPaymentInProgress",void 0),O([h()],$.prototype,"exchangeUrlForQuote",void 0),O([h()],$.prototype,"completedTransactionsCount",void 0),$=O([x("w3m-pay-quote-view")],$);const uo=S`
  wui-image {
    border-radius: ${({borderRadius:e})=>e.round};
  }

  .transfers-badge {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border: 1px solid ${({tokens:e})=>e.theme.foregroundSecondary};
    border-radius: ${({borderRadius:e})=>e[4]};
  }
`;var vt=function(e,t,i,a){var r=arguments.length,o=r<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};let Oe=class extends T{constructor(){super(),this.unsubscribe=[],this.paymentAsset=p.state.paymentAsset,this.amount=p.state.amount,this.unsubscribe.push(p.subscribeKey("paymentAsset",e=>{this.paymentAsset=e}),p.subscribeKey("amount",e=>{this.amount=e}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){var t;const e=g.getAllRequestedCaipNetworks().find(i=>i.caipNetworkId===this.paymentAsset.network);return c`<wui-flex
      alignItems="center"
      gap="1"
      .padding=${["1","2","1","1"]}
      class="transfers-badge"
    >
      <wui-image src=${A(this.paymentAsset.metadata.logoURI)} size="xl"></wui-image>
      <wui-text variant="lg-regular" color="primary">
        ${this.amount} ${this.paymentAsset.metadata.symbol}
      </wui-text>
      <wui-text variant="sm-regular" color="secondary">
        on ${(t=e==null?void 0:e.name)!=null?t:"Unknown"}
      </wui-text>
    </wui-flex>`}};Oe.styles=[uo],vt([u()],Oe.prototype,"paymentAsset",void 0),vt([u()],Oe.prototype,"amount",void 0),Oe=vt([x("w3m-pay-header")],Oe);const po=S`
  :host {
    height: 60px;
  }

  :host > wui-flex {
    box-sizing: border-box;
    background-color: var(--local-header-background-color);
  }

  wui-text {
    background-color: var(--local-header-background-color);
  }

  wui-flex.w3m-header-title {
    transform: translateY(0);
    opacity: 1;
  }

  wui-flex.w3m-header-title[view-direction='prev'] {
    animation:
      slide-down-out 120ms forwards ${({easings:e})=>e["ease-out-power-2"]},
      slide-down-in 120ms forwards ${({easings:e})=>e["ease-out-power-2"]};
    animation-delay: 0ms, 200ms;
  }

  wui-flex.w3m-header-title[view-direction='next'] {
    animation:
      slide-up-out 120ms forwards ${({easings:e})=>e["ease-out-power-2"]},
      slide-up-in 120ms forwards ${({easings:e})=>e["ease-out-power-2"]};
    animation-delay: 0ms, 200ms;
  }

  wui-icon-button[data-hidden='true'] {
    opacity: 0 !important;
    pointer-events: none;
  }

  @keyframes slide-up-out {
    from {
      transform: translateY(0px);
      opacity: 1;
    }
    to {
      transform: translateY(3px);
      opacity: 0;
    }
  }

  @keyframes slide-up-in {
    from {
      transform: translateY(-3px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes slide-down-out {
    from {
      transform: translateY(0px);
      opacity: 1;
    }
    to {
      transform: translateY(-3px);
      opacity: 0;
    }
  }

  @keyframes slide-down-in {
    from {
      transform: translateY(3px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;var ye=function(e,t,i,a){var r=arguments.length,o=r<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};const ho=["SmartSessionList"],mo={PayWithExchange:$e.tokens.theme.foregroundPrimary};function Gt(){var m,b,E,D,_,F,ce,le;const e=(b=(m=w.state.data)==null?void 0:m.connector)==null?void 0:b.name,t=(D=(E=w.state.data)==null?void 0:E.wallet)==null?void 0:D.name,i=(F=(_=w.state.data)==null?void 0:_.network)==null?void 0:F.name,a=t!=null?t:e,r=z.getConnectors(),o=r.length===1&&((ce=r[0])==null?void 0:ce.id)==="w3m-email",n=(le=g.getAccountData())==null?void 0:le.socialProvider,s=n?n.charAt(0).toUpperCase()+n.slice(1):"Connect Social";return{Connect:`Connect ${o?"Email":""} Wallet`,Create:"Create Wallet",ChooseAccountName:void 0,Account:void 0,AccountSettings:void 0,AllWallets:"All Wallets",ApproveTransaction:"Approve Transaction",BuyInProgress:"Buy",UsageExceeded:"Usage Exceeded",ConnectingExternal:a!=null?a:"Connect Wallet",ConnectingWalletConnect:a!=null?a:"WalletConnect",ConnectingWalletConnectBasic:"WalletConnect",ConnectingSiwe:"Sign In",Convert:"Convert",ConvertSelectToken:"Select token",ConvertPreview:"Preview Convert",Downloads:a?`Get ${a}`:"Downloads",EmailLogin:"Email Login",EmailVerifyOtp:"Confirm Email",EmailVerifyDevice:"Register Device",GetWallet:"Get a Wallet",Networks:"Choose Network",OnRampProviders:"Choose Provider",OnRampActivity:"Activity",OnRampTokenSelect:"Select Token",OnRampFiatSelect:"Select Currency",Pay:"How you pay",ProfileWallets:"Wallets",SwitchNetwork:i!=null?i:"Switch Network",Transactions:"Activity",UnsupportedChain:"Switch Network",UpgradeEmailWallet:"Upgrade Your Wallet",UpdateEmailWallet:"Edit Email",UpdateEmailPrimaryOtp:"Confirm Current Email",UpdateEmailSecondaryOtp:"Confirm New Email",WhatIsABuy:"What is Buy?",RegisterAccountName:"Choose Name",RegisterAccountNameSuccess:"",WalletReceive:"Receive",WalletCompatibleNetworks:"Compatible Networks",Swap:"Swap",SwapSelectToken:"Select Token",SwapPreview:"Preview Swap",WalletSend:"Send",WalletSendPreview:"Review Send",WalletSendSelectToken:"Select Token",WalletSendConfirmed:"Confirmed",WhatIsANetwork:"What is a network?",WhatIsAWallet:"What is a Wallet?",ConnectWallets:"Connect Wallet",ConnectSocials:"All Socials",ConnectingSocial:s,ConnectingMultiChain:"Select Chain",ConnectingFarcaster:"Farcaster",SwitchActiveChain:"Switch Chain",SmartSessionCreated:void 0,SmartSessionList:"Smart Sessions",SIWXSignMessage:"Sign In",PayLoading:"Processing payment...",PayQuote:"Payment Quote",DataCapture:"Profile",DataCaptureOtpConfirm:"Confirm Email",FundWallet:"Fund Wallet",PayWithExchange:"Deposit from Exchange",PayWithExchangeSelectAsset:"Select Asset",SmartAccountSettings:"Smart Account Settings"}}let ae=class extends T{constructor(){super(),this.unsubscribe=[],this.heading=Gt()[w.state.view],this.network=g.state.activeCaipNetwork,this.networkImage=M.getNetworkImage(this.network),this.showBack=!1,this.prevHistoryLength=1,this.view=w.state.view,this.viewDirection="",this.unsubscribe.push(ei.subscribeNetworkImages(()=>{this.networkImage=M.getNetworkImage(this.network)}),w.subscribeKey("view",e=>{setTimeout(()=>{this.view=e,this.heading=Gt()[e]},fe.ANIMATION_DURATIONS.HeaderText),this.onViewChange(),this.onHistoryChange()}),g.subscribeKey("activeCaipNetwork",e=>{this.network=e,this.networkImage=M.getNetworkImage(this.network)}))}disconnectCallback(){this.unsubscribe.forEach(e=>e())}render(){var t;const e=(t=mo[w.state.view])!=null?t:$e.tokens.theme.backgroundPrimary;return this.style.setProperty("--local-header-background-color",e),c`
      <wui-flex
        .padding=${["0","4","0","4"]}
        justifyContent="space-between"
        alignItems="center"
      >
        ${this.leftHeaderTemplate()} ${this.titleTemplate()} ${this.rightHeaderTemplate()}
      </wui-flex>
    `}onWalletHelp(){q.sendEvent({type:"track",event:"CLICK_WALLET_HELP"}),w.push("WhatIsAWallet")}async onClose(){await Ut.safeClose()}rightHeaderTemplate(){var t,i,a;const e=(a=(i=(t=P)==null?void 0:t.state)==null?void 0:i.features)==null?void 0:a.smartSessions;return w.state.view!=="Account"||!e?this.closeButtonTemplate():c`<wui-flex>
      <wui-icon-button
        icon="clock"
        size="lg"
        iconSize="lg"
        type="neutral"
        variant="primary"
        @click=${()=>w.push("SmartSessionList")}
        data-testid="w3m-header-smart-sessions"
      ></wui-icon-button>
      ${this.closeButtonTemplate()}
    </wui-flex> `}closeButtonTemplate(){return c`
      <wui-icon-button
        icon="close"
        size="lg"
        type="neutral"
        variant="primary"
        iconSize="lg"
        @click=${this.onClose.bind(this)}
        data-testid="w3m-header-close"
      ></wui-icon-button>
    `}titleTemplate(){if(this.view==="PayQuote")return c`<w3m-pay-header></w3m-pay-header>`;const e=ho.includes(this.view);return c`
      <wui-flex
        view-direction="${this.viewDirection}"
        class="w3m-header-title"
        alignItems="center"
        gap="2"
      >
        <wui-text
          display="inline"
          variant="lg-regular"
          color="primary"
          data-testid="w3m-header-text"
        >
          ${this.heading}
        </wui-text>
        ${e?c`<wui-tag variant="accent" size="md">Beta</wui-tag>`:null}
      </wui-flex>
    `}leftHeaderTemplate(){var m;const{view:e}=w.state,t=e==="Connect",i=P.state.enableEmbedded,a=e==="ApproveTransaction",r=e==="ConnectingSiwe",o=e==="Account",n=P.state.enableNetworkSwitch,s=a||r||t&&i;return o&&n?c`<wui-select
        id="dynamic"
        data-testid="w3m-account-select-network"
        active-network=${A((m=this.network)==null?void 0:m.name)}
        @click=${this.onNetworks.bind(this)}
        imageSrc=${A(this.networkImage)}
      ></wui-select>`:this.showBack&&!s?c`<wui-icon-button
        data-testid="header-back"
        id="dynamic"
        icon="chevronLeft"
        size="lg"
        iconSize="lg"
        type="neutral"
        variant="primary"
        @click=${this.onGoBack.bind(this)}
      ></wui-icon-button>`:c`<wui-icon-button
      data-hidden=${!t}
      id="dynamic"
      icon="helpCircle"
      size="lg"
      iconSize="lg"
      type="neutral"
      variant="primary"
      @click=${this.onWalletHelp.bind(this)}
    ></wui-icon-button>`}onNetworks(){this.isAllowedNetworkSwitch()&&(q.sendEvent({type:"track",event:"CLICK_NETWORKS"}),w.push("Networks"))}isAllowedNetworkSwitch(){const e=g.getAllRequestedCaipNetworks(),t=e?e.length>1:!1,i=e==null?void 0:e.find(({id:a})=>{var r;return a===((r=this.network)==null?void 0:r.id)});return t||!i}onViewChange(){const{history:e}=w.state;let t=fe.VIEW_DIRECTION.Next;e.length<this.prevHistoryLength&&(t=fe.VIEW_DIRECTION.Prev),this.prevHistoryLength=e.length,this.viewDirection=t}async onHistoryChange(){var i;const{history:e}=w.state,t=(i=this.shadowRoot)==null?void 0:i.querySelector("#dynamic");e.length>1&&!this.showBack&&t?(await t.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.showBack=!0,t.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"})):e.length<=1&&this.showBack&&t&&(await t.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.showBack=!1,t.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"}))}onGoBack(){w.goBack()}};ae.styles=po,ye([h()],ae.prototype,"heading",void 0),ye([h()],ae.prototype,"network",void 0),ye([h()],ae.prototype,"networkImage",void 0),ye([h()],ae.prototype,"showBack",void 0),ye([h()],ae.prototype,"prevHistoryLength",void 0),ye([h()],ae.prototype,"view",void 0),ye([h()],ae.prototype,"viewDirection",void 0),ae=ye([x("w3m-header")],ae);const wo=S`
  :host {
    display: flex;
    align-items: center;
    gap: ${({spacing:e})=>e[1]};
    padding: ${({spacing:e})=>e[2]} ${({spacing:e})=>e[3]}
      ${({spacing:e})=>e[2]} ${({spacing:e})=>e[2]};
    border-radius: ${({borderRadius:e})=>e[20]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    box-shadow:
      0px 0px 8px 0px rgba(0, 0, 0, 0.1),
      inset 0 0 0 1px ${({tokens:e})=>e.theme.borderPrimary};
    max-width: 320px;
  }

  wui-icon-box {
    border-radius: ${({borderRadius:e})=>e.round} !important;
    overflow: hidden;
  }

  wui-loading-spinner {
    padding: ${({spacing:e})=>e[1]};
    background-color: ${({tokens:e})=>e.core.foregroundAccent010};
    border-radius: ${({borderRadius:e})=>e.round} !important;
  }
`;var kt=function(e,t,i,a){var r=arguments.length,o=r<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};let _e=class extends T{constructor(){super(...arguments),this.message="",this.variant="success"}render(){return c`
      ${this.templateIcon()}
      <wui-text variant="lg-regular" color="primary" data-testid="wui-snackbar-message"
        >${this.message}</wui-text
      >
    `}templateIcon(){const e={success:"success",error:"error",warning:"warning",info:"default"},t={success:"checkmark",error:"warning",warning:"warningCircle",info:"info"};return this.variant==="loading"?c`<wui-loading-spinner size="md" color="accent-primary"></wui-loading-spinner>`:c`<wui-icon-box
      size="md"
      color=${e[this.variant]}
      icon=${t[this.variant]}
    ></wui-icon-box>`}};_e.styles=[ee,wo],kt([u()],_e.prototype,"message",void 0),kt([u()],_e.prototype,"variant",void 0),_e=kt([x("wui-snackbar")],_e);const go=qe`
  :host {
    display: block;
    position: absolute;
    opacity: 0;
    pointer-events: none;
    top: 11px;
    left: 50%;
    width: max-content;
  }
`;var Ht=function(e,t,i,a){var r=arguments.length,o=r<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};let Je=class extends T{constructor(){super(),this.unsubscribe=[],this.timeout=void 0,this.open=I.state.open,this.unsubscribe.push(I.subscribeKey("open",e=>{this.open=e,this.onOpen()}))}disconnectedCallback(){clearTimeout(this.timeout),this.unsubscribe.forEach(e=>e())}render(){const{message:e,variant:t}=I.state;return c` <wui-snackbar message=${e} variant=${t}></wui-snackbar> `}onOpen(){clearTimeout(this.timeout),this.open?(this.animate([{opacity:0,transform:"translateX(-50%) scale(0.85)"},{opacity:1,transform:"translateX(-50%) scale(1)"}],{duration:150,fill:"forwards",easing:"ease"}),this.timeout&&clearTimeout(this.timeout),I.state.autoClose&&(this.timeout=setTimeout(()=>I.hide(),2500))):this.animate([{opacity:1,transform:"translateX(-50%) scale(1)"},{opacity:0,transform:"translateX(-50%) scale(0.85)"}],{duration:150,fill:"forwards",easing:"ease"})}};Je.styles=go,Ht([h()],Je.prototype,"open",void 0),Je=Ht([x("w3m-snackbar")],Je);const yo=qe`
  :host {
    width: 100%;
    display: block;
  }
`;var xt=function(e,t,i,a){var r=arguments.length,o=r<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};let Ue=class extends T{constructor(){super(),this.unsubscribe=[],this.text="",this.open=Y.state.open,this.unsubscribe.push(w.subscribeKey("view",()=>{Y.hide()}),L.subscribeKey("open",e=>{e||Y.hide()}),Y.subscribeKey("open",e=>{this.open=e}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e()),Y.hide()}render(){return c`
      <div
        @pointermove=${this.onMouseEnter.bind(this)}
        @pointerleave=${this.onMouseLeave.bind(this)}
      >
        ${this.renderChildren()}
      </div>
    `}renderChildren(){return c`<slot></slot> `}onMouseEnter(){const e=this.getBoundingClientRect();if(!this.open){const t=document.querySelector("w3m-modal"),i={width:e.width,height:e.height,left:e.left,top:e.top};if(t){const a=t.getBoundingClientRect();i.left=e.left-(window.innerWidth-a.width)/2,i.top=e.top-(window.innerHeight-a.height)/2}Y.showTooltip({message:this.text,triggerRect:i,variant:"shade"})}}onMouseLeave(e){this.contains(e.relatedTarget)||Y.hide()}};Ue.styles=[yo],xt([u()],Ue.prototype,"text",void 0),xt([h()],Ue.prototype,"open",void 0),Ue=xt([x("w3m-tooltip-trigger")],Ue);const fo=S`
  :host {
    pointer-events: none;
  }

  :host > wui-flex {
    display: var(--w3m-tooltip-display);
    opacity: var(--w3m-tooltip-opacity);
    padding: 9px ${({spacing:e})=>e[3]} 10px ${({spacing:e})=>e[3]};
    border-radius: ${({borderRadius:e})=>e[3]};
    color: ${({tokens:e})=>e.theme.backgroundPrimary};
    position: absolute;
    top: var(--w3m-tooltip-top);
    left: var(--w3m-tooltip-left);
    transform: translate(calc(-50% + var(--w3m-tooltip-parent-width)), calc(-100% - 8px));
    max-width: calc(var(--apkt-modal-width) - ${({spacing:e})=>e[5]});
    transition: opacity ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
    will-change: opacity;
    opacity: 0;
    animation-duration: ${({durations:e})=>e.xl};
    animation-timing-function: ${({easings:e})=>e["ease-out-power-2"]};
    animation-name: fade-in;
    animation-fill-mode: forwards;
  }

  :host([data-variant='shade']) > wui-flex {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  :host([data-variant='shade']) > wui-flex > wui-text {
    color: ${({tokens:e})=>e.theme.textSecondary};
  }

  :host([data-variant='fill']) > wui-flex {
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    border: 1px solid ${({tokens:e})=>e.theme.borderPrimary};
  }

  wui-icon {
    position: absolute;
    width: 12px !important;
    height: 4px !important;
    color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  wui-icon[data-placement='top'] {
    bottom: 0px;
    left: 50%;
    transform: translate(-50%, 95%);
  }

  wui-icon[data-placement='bottom'] {
    top: 0;
    left: 50%;
    transform: translate(-50%, -95%) rotate(180deg);
  }

  wui-icon[data-placement='right'] {
    top: 50%;
    left: 0;
    transform: translate(-65%, -50%) rotate(90deg);
  }

  wui-icon[data-placement='left'] {
    top: 50%;
    right: 0%;
    transform: translate(65%, -50%) rotate(270deg);
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;var De=function(e,t,i,a){var r=arguments.length,o=r<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};let ve=class extends T{constructor(){super(),this.unsubscribe=[],this.open=Y.state.open,this.message=Y.state.message,this.triggerRect=Y.state.triggerRect,this.variant=Y.state.variant,this.unsubscribe.push(Y.subscribe(e=>{this.open=e.open,this.message=e.message,this.triggerRect=e.triggerRect,this.variant=e.variant}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){this.dataset.variant=this.variant;const e=this.triggerRect.top,t=this.triggerRect.left;return this.style.cssText=`
    --w3m-tooltip-top: ${e}px;
    --w3m-tooltip-left: ${t}px;
    --w3m-tooltip-parent-width: ${this.triggerRect.width/2}px;
    --w3m-tooltip-display: ${this.open?"flex":"none"};
    --w3m-tooltip-opacity: ${this.open?1:0};
    `,c`<wui-flex>
      <wui-icon data-placement="top" size="inherit" name="cursor"></wui-icon>
      <wui-text color="primary" variant="sm-regular">${this.message}</wui-text>
    </wui-flex>`}};ve.styles=[fo],De([h()],ve.prototype,"open",void 0),De([h()],ve.prototype,"message",void 0),De([h()],ve.prototype,"triggerRect",void 0),De([h()],ve.prototype,"variant",void 0),ve=De([x("w3m-tooltip")],ve);const Le={getTabsByNamespace(e){var t;return e&&e===C.CHAIN.EVM?((t=P.state.remoteFeatures)==null?void 0:t.activity)===!1?fe.ACCOUNT_TABS.filter(i=>i.label!=="Activity"):fe.ACCOUNT_TABS:[]},isValidReownName(e){return/^[a-zA-Z0-9]+$/gu.test(e)},isValidEmail(e){return/^[^\s@]+@[^\s@]+\.[^\s@]+$/gu.test(e)},validateReownName(e){return e.replace(/\^/gu,"").toLowerCase().replace(/[^a-zA-Z0-9]/gu,"")},hasFooter(){var t;const e=w.state.view;if(fe.VIEWS_WITH_LEGAL_FOOTER.includes(e)){const{termsConditionsUrl:i,privacyPolicyUrl:a}=P.state,r=(t=P.state.features)==null?void 0:t.legalCheckbox;return!(!i&&!a||r)}return fe.VIEWS_WITH_DEFAULT_FOOTER.includes(e)}},bo=S`
  :host wui-ux-by-reown {
    padding-top: 0;
  }

  :host wui-ux-by-reown.branding-only {
    padding-top: ${({spacing:e})=>e[3]};
  }

  a {
    text-decoration: none;
    color: ${({tokens:e})=>e.core.textAccentPrimary};
    font-weight: 500;
  }
`;var Yt=function(e,t,i,a){var r=arguments.length,o=r<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};let et=class extends T{constructor(){super(),this.unsubscribe=[],this.remoteFeatures=P.state.remoteFeatures,this.unsubscribe.push(P.subscribeKey("remoteFeatures",e=>this.remoteFeatures=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){var a;const{termsConditionsUrl:e,privacyPolicyUrl:t}=P.state,i=(a=P.state.features)==null?void 0:a.legalCheckbox;return!e&&!t||i?c`
        <wui-flex flexDirection="column"> ${this.reownBrandingTemplate(!0)} </wui-flex>
      `:c`
      <wui-flex flexDirection="column">
        <wui-flex .padding=${["4","3","3","3"]} justifyContent="center">
          <wui-text color="secondary" variant="md-regular" align="center">
            By connecting your wallet, you agree to our <br />
            ${this.termsTemplate()} ${this.andTemplate()} ${this.privacyTemplate()}
          </wui-text>
        </wui-flex>
        ${this.reownBrandingTemplate()}
      </wui-flex>
    `}andTemplate(){const{termsConditionsUrl:e,privacyPolicyUrl:t}=P.state;return e&&t?"and":""}termsTemplate(){const{termsConditionsUrl:e}=P.state;return e?c`<a href=${e} target="_blank" rel="noopener noreferrer"
      >Terms of Service</a
    >`:null}privacyTemplate(){const{privacyPolicyUrl:e}=P.state;return e?c`<a href=${e} target="_blank" rel="noopener noreferrer"
      >Privacy Policy</a
    >`:null}reownBrandingTemplate(e=!1){var t;return(t=this.remoteFeatures)!=null&&t.reownBranding?e?c`<wui-ux-by-reown class="branding-only"></wui-ux-by-reown>`:c`<wui-ux-by-reown></wui-ux-by-reown>`:null}};et.styles=[bo],Yt([h()],et.prototype,"remoteFeatures",void 0),et=Yt([x("w3m-legal-footer")],et);const vo=qe``;var ko=function(e,t,i,a){var r=arguments.length,o=r<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};let Tt=class extends T{render(){const{termsConditionsUrl:e,privacyPolicyUrl:t}=P.state;return!e&&!t?null:c`
      <wui-flex
        .padding=${["4","3","3","3"]}
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        gap="3"
      >
        <wui-text color="secondary" variant="md-regular" align="center">
          We work with the best providers to give you the lowest fees and best support. More options
          coming soon!
        </wui-text>

        ${this.howDoesItWorkTemplate()}
      </wui-flex>
    `}howDoesItWorkTemplate(){return c` <wui-link @click=${this.onWhatIsBuy.bind(this)}>
      <wui-icon size="xs" color="accent-primary" slot="iconLeft" name="helpCircle"></wui-icon>
      How does it work?
    </wui-link>`}onWhatIsBuy(){q.sendEvent({type:"track",event:"SELECT_WHAT_IS_A_BUY",properties:{isSmartAccount:Be(g.state.activeChain)===je.ACCOUNT_TYPES.SMART_ACCOUNT}}),w.push("WhatIsABuy")}};Tt.styles=[vo],Tt=ko([x("w3m-onramp-providers-footer")],Tt);const xo=S`
  :host {
    display: block;
  }

  div.container {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    overflow: hidden;
    height: auto;
    display: block;
  }

  div.container[status='hide'] {
    animation: fade-out;
    animation-duration: var(--apkt-duration-dynamic);
    animation-timing-function: ${({easings:e})=>e["ease-out-power-2"]};
    animation-fill-mode: both;
    animation-delay: 0s;
  }

  div.container[status='show'] {
    animation: fade-in;
    animation-duration: var(--apkt-duration-dynamic);
    animation-timing-function: ${({easings:e})=>e["ease-out-power-2"]};
    animation-fill-mode: both;
    animation-delay: var(--apkt-duration-dynamic);
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      filter: blur(6px);
    }
    to {
      opacity: 1;
      filter: blur(0px);
    }
  }

  @keyframes fade-out {
    from {
      opacity: 1;
      filter: blur(0px);
    }
    to {
      opacity: 0;
      filter: blur(6px);
    }
  }
`;var At=function(e,t,i,a){var r=arguments.length,o=r<3?t:a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};let We=class extends T{constructor(){super(...arguments),this.resizeObserver=void 0,this.unsubscribe=[],this.status="hide",this.view=w.state.view}firstUpdated(){this.status=Le.hasFooter()?"show":"hide",this.unsubscribe.push(w.subscribeKey("view",e=>{this.view=e,this.status=Le.hasFooter()?"show":"hide",this.status==="hide"&&document.documentElement.style.setProperty("--apkt-footer-height","0px")})),this.resizeObserver=new ResizeObserver(e=>{for(const t of e)if(t.target===this.getWrapper()){const i=`${t.contentRect.height}px`;document.documentElement.style.setProperty("--apkt-footer-height",i)}}),this.resizeObserver.observe(this.getWrapper())}render(){return c`
      <div class="container" status=${this.status}>${this.templatePageContainer()}</div>
    `}templatePageContainer(){return Le.hasFooter()?c` ${this.templateFooter()}`:null}templateFooter(){switch(this.view){case"Networks":return this.templateNetworksFooter();case"Connect":case"ConnectWallets":case"OnRampFiatSelect":case"OnRampTokenSelect":return c`<w3m-legal-footer></w3m-legal-footer>`;case"OnRampProviders":return c`<w3m-onramp-providers-footer></w3m-onramp-providers-footer>`;default:return null}}templateNetworksFooter(){return c` <wui-flex
      class="footer-in"
      padding="3"
      flexDirection="column"
      gap="3"
      alignItems="center"
    >
      <wui-text variant="md-regular" color="secondary" align="center">
        Your connected wallet may not support some of the networks available for this dApp
      </wui-text>
      <wui-link @click=${this.onNetworkHelp.bind(this)}>
        <wui-icon size="sm" color="accent-primary" slot="iconLeft" name="helpCircle"></wui-icon>
        What is a network
      </wui-link>
    </wui-flex>`}onNetworkHelp(){q.sendEvent({type:"track",event:"CLICK_NETWORK_HELP"}),w.push("WhatIsANetwork")}getWrapper(){var e;return(e=this.shadowRoot)==null?void 0:e.querySelector("div.container")}};We.styles=[xo],At([h()],We.prototype,"status",void 0),At([h()],We.prototype,"view",void 0),We=At([x("w3m-footer")],We);const To=S`
  :host {
    display: block;
    width: inherit;
  }
`;var St=function(e,t,i,a){var r=arguments.length,o=r<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};let ze=class extends T{constructor(){super(),this.unsubscribe=[],this.viewState=w.state.view,this.history=w.state.history.join(","),this.unsubscribe.push(w.subscribeKey("view",()=>{this.history=w.state.history.join(","),document.documentElement.style.setProperty("--apkt-duration-dynamic","var(--apkt-durations-lg)")}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e()),document.documentElement.style.setProperty("--apkt-duration-dynamic","0s")}render(){return c`${this.templatePageContainer()}`}templatePageContainer(){return c`<w3m-router-container
      history=${this.history}
      .setView=${()=>{this.viewState=w.state.view}}
    >
      ${this.viewTemplate(this.viewState)}
    </w3m-router-container>`}viewTemplate(e){switch(e){case"AccountSettings":return c`<w3m-account-settings-view></w3m-account-settings-view>`;case"Account":return c`<w3m-account-view></w3m-account-view>`;case"AllWallets":return c`<w3m-all-wallets-view></w3m-all-wallets-view>`;case"ApproveTransaction":return c`<w3m-approve-transaction-view></w3m-approve-transaction-view>`;case"BuyInProgress":return c`<w3m-buy-in-progress-view></w3m-buy-in-progress-view>`;case"ChooseAccountName":return c`<w3m-choose-account-name-view></w3m-choose-account-name-view>`;case"Connect":return c`<w3m-connect-view></w3m-connect-view>`;case"Create":return c`<w3m-connect-view walletGuide="explore"></w3m-connect-view>`;case"ConnectingWalletConnect":return c`<w3m-connecting-wc-view></w3m-connecting-wc-view>`;case"ConnectingWalletConnectBasic":return c`<w3m-connecting-wc-basic-view></w3m-connecting-wc-basic-view>`;case"ConnectingExternal":return c`<w3m-connecting-external-view></w3m-connecting-external-view>`;case"ConnectingSiwe":return c`<w3m-connecting-siwe-view></w3m-connecting-siwe-view>`;case"ConnectWallets":return c`<w3m-connect-wallets-view></w3m-connect-wallets-view>`;case"ConnectSocials":return c`<w3m-connect-socials-view></w3m-connect-socials-view>`;case"ConnectingSocial":return c`<w3m-connecting-social-view></w3m-connecting-social-view>`;case"DataCapture":return c`<w3m-data-capture-view></w3m-data-capture-view>`;case"DataCaptureOtpConfirm":return c`<w3m-data-capture-otp-confirm-view></w3m-data-capture-otp-confirm-view>`;case"Downloads":return c`<w3m-downloads-view></w3m-downloads-view>`;case"EmailLogin":return c`<w3m-email-login-view></w3m-email-login-view>`;case"EmailVerifyOtp":return c`<w3m-email-verify-otp-view></w3m-email-verify-otp-view>`;case"EmailVerifyDevice":return c`<w3m-email-verify-device-view></w3m-email-verify-device-view>`;case"GetWallet":return c`<w3m-get-wallet-view></w3m-get-wallet-view>`;case"Networks":return c`<w3m-networks-view></w3m-networks-view>`;case"SwitchNetwork":return c`<w3m-network-switch-view></w3m-network-switch-view>`;case"ProfileWallets":return c`<w3m-profile-wallets-view></w3m-profile-wallets-view>`;case"Transactions":return c`<w3m-transactions-view></w3m-transactions-view>`;case"OnRampProviders":return c`<w3m-onramp-providers-view></w3m-onramp-providers-view>`;case"OnRampTokenSelect":return c`<w3m-onramp-token-select-view></w3m-onramp-token-select-view>`;case"OnRampFiatSelect":return c`<w3m-onramp-fiat-select-view></w3m-onramp-fiat-select-view>`;case"UpgradeEmailWallet":return c`<w3m-upgrade-wallet-view></w3m-upgrade-wallet-view>`;case"UpdateEmailWallet":return c`<w3m-update-email-wallet-view></w3m-update-email-wallet-view>`;case"UpdateEmailPrimaryOtp":return c`<w3m-update-email-primary-otp-view></w3m-update-email-primary-otp-view>`;case"UpdateEmailSecondaryOtp":return c`<w3m-update-email-secondary-otp-view></w3m-update-email-secondary-otp-view>`;case"UnsupportedChain":return c`<w3m-unsupported-chain-view></w3m-unsupported-chain-view>`;case"Swap":return c`<w3m-swap-view></w3m-swap-view>`;case"SwapSelectToken":return c`<w3m-swap-select-token-view></w3m-swap-select-token-view>`;case"SwapPreview":return c`<w3m-swap-preview-view></w3m-swap-preview-view>`;case"WalletSend":return c`<w3m-wallet-send-view></w3m-wallet-send-view>`;case"WalletSendSelectToken":return c`<w3m-wallet-send-select-token-view></w3m-wallet-send-select-token-view>`;case"WalletSendPreview":return c`<w3m-wallet-send-preview-view></w3m-wallet-send-preview-view>`;case"WalletSendConfirmed":return c`<w3m-send-confirmed-view></w3m-send-confirmed-view>`;case"WhatIsABuy":return c`<w3m-what-is-a-buy-view></w3m-what-is-a-buy-view>`;case"WalletReceive":return c`<w3m-wallet-receive-view></w3m-wallet-receive-view>`;case"WalletCompatibleNetworks":return c`<w3m-wallet-compatible-networks-view></w3m-wallet-compatible-networks-view>`;case"WhatIsAWallet":return c`<w3m-what-is-a-wallet-view></w3m-what-is-a-wallet-view>`;case"ConnectingMultiChain":return c`<w3m-connecting-multi-chain-view></w3m-connecting-multi-chain-view>`;case"WhatIsANetwork":return c`<w3m-what-is-a-network-view></w3m-what-is-a-network-view>`;case"ConnectingFarcaster":return c`<w3m-connecting-farcaster-view></w3m-connecting-farcaster-view>`;case"SwitchActiveChain":return c`<w3m-switch-active-chain-view></w3m-switch-active-chain-view>`;case"RegisterAccountName":return c`<w3m-register-account-name-view></w3m-register-account-name-view>`;case"RegisterAccountNameSuccess":return c`<w3m-register-account-name-success-view></w3m-register-account-name-success-view>`;case"SmartSessionCreated":return c`<w3m-smart-session-created-view></w3m-smart-session-created-view>`;case"SmartSessionList":return c`<w3m-smart-session-list-view></w3m-smart-session-list-view>`;case"SIWXSignMessage":return c`<w3m-siwx-sign-message-view></w3m-siwx-sign-message-view>`;case"Pay":return c`<w3m-pay-view></w3m-pay-view>`;case"PayLoading":return c`<w3m-pay-loading-view></w3m-pay-loading-view>`;case"PayQuote":return c`<w3m-pay-quote-view></w3m-pay-quote-view>`;case"FundWallet":return c`<w3m-fund-wallet-view></w3m-fund-wallet-view>`;case"PayWithExchange":return c`<w3m-deposit-from-exchange-view></w3m-deposit-from-exchange-view>`;case"PayWithExchangeSelectAsset":return c`<w3m-deposit-from-exchange-select-asset-view></w3m-deposit-from-exchange-select-asset-view>`;case"UsageExceeded":return c`<w3m-usage-exceeded-view></w3m-usage-exceeded-view>`;case"SmartAccountSettings":return c`<w3m-smart-account-settings-view></w3m-smart-account-settings-view>`;default:return c`<w3m-connect-view></w3m-connect-view>`}}};ze.styles=[To],St([h()],ze.prototype,"viewState",void 0),St([h()],ze.prototype,"history",void 0),ze=St([x("w3m-router")],ze);const Ao=S`
  :host {
    z-index: ${({tokens:e})=>e.core.zIndex};
    display: block;
    backface-visibility: hidden;
    will-change: opacity;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    opacity: 0;
    background-color: ${({tokens:e})=>e.theme.overlay};
    backdrop-filter: blur(0px);
    transition:
      opacity ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      backdrop-filter ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]};
    will-change: opacity;
  }

  :host(.open) {
    opacity: 1;
    backdrop-filter: blur(8px);
  }

  :host(.appkit-modal) {
    position: relative;
    pointer-events: unset;
    background: none;
    width: 100%;
    opacity: 1;
  }

  wui-card {
    max-width: var(--apkt-modal-width);
    width: 100%;
    position: relative;
    outline: none;
    transform: translateY(4px);
    box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.05);
    transition:
      transform ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      border-radius ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-1"]},
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-1"]},
      box-shadow ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-1"]};
    will-change: border-radius, background-color, transform, box-shadow;
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    padding: var(--local-modal-padding);
    box-sizing: border-box;
  }

  :host(.open) wui-card {
    transform: translateY(0px);
  }

  wui-card::before {
    z-index: 1;
    pointer-events: none;
    content: '';
    position: absolute;
    inset: 0;
    border-radius: clamp(0px, var(--apkt-borderRadius-8), 44px);
    transition: box-shadow ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
    transition-delay: ${({durations:e})=>e.md};
    will-change: box-shadow;
  }

  :host([data-mobile-fullscreen='true']) wui-card::before {
    border-radius: 0px;
  }

  :host([data-border='true']) wui-card::before {
    box-shadow: inset 0px 0px 0px 4px ${({tokens:e})=>e.theme.foregroundSecondary};
  }

  :host([data-border='false']) wui-card::before {
    box-shadow: inset 0px 0px 0px 1px ${({tokens:e})=>e.theme.borderPrimaryDark};
  }

  :host([data-border='true']) wui-card {
    animation:
      fade-in ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      card-background-border var(--apkt-duration-dynamic)
        ${({easings:e})=>e["ease-out-power-2"]};
    animation-fill-mode: backwards, both;
    animation-delay: var(--apkt-duration-dynamic);
  }

  :host([data-border='false']) wui-card {
    animation:
      fade-in ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      card-background-default var(--apkt-duration-dynamic)
        ${({easings:e})=>e["ease-out-power-2"]};
    animation-fill-mode: backwards, both;
    animation-delay: 0s;
  }

  :host(.appkit-modal) wui-card {
    max-width: var(--apkt-modal-width);
  }

  wui-card[shake='true'] {
    animation:
      fade-in ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      w3m-shake ${({durations:e})=>e.xl}
        ${({easings:e})=>e["ease-out-power-2"]};
  }

  wui-flex {
    overflow-x: hidden;
    overflow-y: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  @media (max-height: 700px) and (min-width: 431px) {
    wui-flex {
      align-items: flex-start;
    }

    wui-card {
      margin: var(--apkt-spacing-6) 0px;
    }
  }

  @media (max-width: 430px) {
    :host([data-mobile-fullscreen='true']) {
      height: 100dvh;
    }
    :host([data-mobile-fullscreen='true']) wui-flex {
      align-items: stretch;
    }
    :host([data-mobile-fullscreen='true']) wui-card {
      max-width: 100%;
      height: 100%;
      border-radius: 0;
      border: none;
    }
    :host(:not([data-mobile-fullscreen='true'])) wui-flex {
      align-items: flex-end;
    }

    :host(:not([data-mobile-fullscreen='true'])) wui-card {
      max-width: 100%;
      border-bottom: none;
    }

    :host(:not([data-mobile-fullscreen='true'])) wui-card[data-embedded='true'] {
      border-bottom-left-radius: clamp(0px, var(--apkt-borderRadius-8), 44px);
      border-bottom-right-radius: clamp(0px, var(--apkt-borderRadius-8), 44px);
    }

    :host(:not([data-mobile-fullscreen='true'])) wui-card:not([data-embedded='true']) {
      border-bottom-left-radius: 0px;
      border-bottom-right-radius: 0px;
    }

    wui-card[shake='true'] {
      animation: w3m-shake 0.5s ${({easings:e})=>e["ease-out-power-2"]};
    }
  }

  @keyframes fade-in {
    0% {
      transform: scale(0.99) translateY(4px);
    }
    100% {
      transform: scale(1) translateY(0);
    }
  }

  @keyframes w3m-shake {
    0% {
      transform: scale(1) rotate(0deg);
    }
    20% {
      transform: scale(1) rotate(-1deg);
    }
    40% {
      transform: scale(1) rotate(1.5deg);
    }
    60% {
      transform: scale(1) rotate(-1.5deg);
    }
    80% {
      transform: scale(1) rotate(1deg);
    }
    100% {
      transform: scale(1) rotate(0deg);
    }
  }

  @keyframes card-background-border {
    from {
      background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    }
    to {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
  }

  @keyframes card-background-default {
    from {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
    to {
      background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    }
  }
`;var re=function(e,t,i,a){var r=arguments.length,o=r<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};const Kt="scroll-lock",So={PayWithExchange:"0",PayWithExchangeSelectAsset:"0",Pay:"0",PayQuote:"0",PayLoading:"0"};class Q extends T{constructor(){super(),this.unsubscribe=[],this.abortController=void 0,this.hasPrefetched=!1,this.enableEmbedded=P.state.enableEmbedded,this.open=L.state.open,this.caipAddress=g.state.activeCaipAddress,this.caipNetwork=g.state.activeCaipNetwork,this.shake=L.state.shake,this.filterByNamespace=z.state.filterByNamespace,this.padding=$e.spacing[1],this.mobileFullScreen=P.state.enableMobileFullScreen,this.initializeTheming(),Me.prefetchAnalyticsConfig(),this.unsubscribe.push(L.subscribeKey("open",t=>t?this.onOpen():this.onClose()),L.subscribeKey("shake",t=>this.shake=t),g.subscribeKey("activeCaipNetwork",t=>this.onNewNetwork(t)),g.subscribeKey("activeCaipAddress",t=>this.onNewAddress(t)),P.subscribeKey("enableEmbedded",t=>this.enableEmbedded=t),z.subscribeKey("filterByNamespace",t=>{var i;this.filterByNamespace!==t&&!((i=g.getAccountData(t))!=null&&i.caipAddress)&&(Me.fetchRecommendedWallets(),this.filterByNamespace=t)}),w.subscribeKey("view",()=>{var t;this.dataset.border=Le.hasFooter()?"true":"false",this.padding=(t=So[w.state.view])!=null?t:$e.spacing[1]}))}firstUpdated(){if(this.dataset.border=Le.hasFooter()?"true":"false",this.mobileFullScreen&&this.setAttribute("data-mobile-fullscreen","true"),this.caipAddress){if(this.enableEmbedded){L.close(),this.prefetch();return}this.onNewAddress(this.caipAddress)}this.open&&this.onOpen(),this.enableEmbedded&&this.prefetch()}disconnectedCallback(){this.unsubscribe.forEach(t=>t()),this.onRemoveKeyboardListener()}render(){return this.style.setProperty("--local-modal-padding",this.padding),this.enableEmbedded?c`${this.contentTemplate()}
        <w3m-tooltip></w3m-tooltip> `:this.open?c`
          <wui-flex @click=${this.onOverlayClick.bind(this)} data-testid="w3m-modal-overlay">
            ${this.contentTemplate()}
          </wui-flex>
          <w3m-tooltip></w3m-tooltip>
        `:null}contentTemplate(){return c` <wui-card
      shake="${this.shake}"
      data-embedded="${A(this.enableEmbedded)}"
      role="alertdialog"
      aria-modal="true"
      tabindex="0"
      data-testid="w3m-modal-card"
    >
      <w3m-header></w3m-header>
      <w3m-router></w3m-router>
      <w3m-footer></w3m-footer>
      <w3m-snackbar></w3m-snackbar>
      <w3m-alertbar></w3m-alertbar>
    </wui-card>`}async onOverlayClick(t){if(t.target===t.currentTarget){if(this.mobileFullScreen)return;await this.handleClose()}}async handleClose(){await Ut.safeClose()}initializeTheming(){const{themeVariables:t,themeMode:i}=ti.state,a=Ve.getColorTheme(i);ii(t,a)}onClose(){this.open=!1,this.classList.remove("open"),this.onScrollUnlock(),I.hide(),this.onRemoveKeyboardListener()}onOpen(){this.open=!0,this.classList.add("open"),this.onScrollLock(),this.onAddKeyboardListener()}onScrollLock(){const t=document.createElement("style");t.dataset.w3m=Kt,t.textContent=`
      body {
        touch-action: none;
        overflow: hidden;
        overscroll-behavior: contain;
      }
      w3m-modal {
        pointer-events: auto;
      }
    `,document.head.appendChild(t)}onScrollUnlock(){const t=document.head.querySelector(`style[data-w3m="${Kt}"]`);t&&t.remove()}onAddKeyboardListener(){var i;this.abortController=new AbortController;const t=(i=this.shadowRoot)==null?void 0:i.querySelector("wui-card");t==null||t.focus(),window.addEventListener("keydown",a=>{if(a.key==="Escape")this.handleClose();else if(a.key==="Tab"){const{tagName:r}=a.target;r&&!r.includes("W3M-")&&!r.includes("WUI-")&&(t==null||t.focus())}},this.abortController)}onRemoveKeyboardListener(){var t;(t=this.abortController)==null||t.abort(),this.abortController=void 0}async onNewAddress(t){const i=g.state.isSwitchingNamespace,a=w.state.view==="ProfileWallets";!t&&!i&&!a&&L.close(),await $t.initializeIfEnabled(t),this.caipAddress=t,g.setIsSwitchingNamespace(!1)}onNewNetwork(t){var m,b,E;const i=(b=(m=this.caipNetwork)==null?void 0:m.caipNetworkId)==null?void 0:b.toString(),a=(E=t==null?void 0:t.caipNetworkId)==null?void 0:E.toString(),r=i!==a,o=w.state.view==="UnsupportedChain",n=L.state.open;let s=!1;this.enableEmbedded&&w.state.view==="SwitchNetwork"&&(s=!0),r&&y.resetState(),n&&o&&(s=!0),s&&w.state.view!=="SIWXSignMessage"&&w.goBack(),this.caipNetwork=t}prefetch(){this.hasPrefetched||(Me.prefetch(),Me.fetchWalletsByPage({page:1}),this.hasPrefetched=!0)}}Q.styles=Ao,re([u({type:Boolean})],Q.prototype,"enableEmbedded",void 0),re([h()],Q.prototype,"open",void 0),re([h()],Q.prototype,"caipAddress",void 0),re([h()],Q.prototype,"caipNetwork",void 0),re([h()],Q.prototype,"shake",void 0),re([h()],Q.prototype,"filterByNamespace",void 0),re([h()],Q.prototype,"padding",void 0),re([h()],Q.prototype,"mobileFullScreen",void 0);let It=class extends Q{};It=re([x("w3m-modal")],It);let Et=class extends Q{};Et=re([x("appkit-modal")],Et);const Io=S`
  .icon-box {
    width: 64px;
    height: 64px;
    border-radius: ${({borderRadius:e})=>e[5]};
    background-color: ${({colors:e})=>e.semanticError010};
  }
`;var Eo=function(e,t,i,a){var r=arguments.length,o=r<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};let tt=class extends T{constructor(){super()}render(){return c`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        gap="4"
        .padding="${["1","3","4","3"]}"
      >
        <wui-flex justifyContent="center" alignItems="center" class="icon-box">
          <wui-icon size="xxl" color="error" name="warningCircle"></wui-icon>
        </wui-flex>

        <wui-text variant="lg-medium" color="primary" align="center">
          The app isn't responding as expected
        </wui-text>
        <wui-text variant="md-regular" color="secondary" align="center">
          Try again or reach out to the app team for help.
        </wui-text>

        <wui-button
          variant="neutral-secondary"
          size="md"
          @click=${this.onTryAgainClick.bind(this)}
          data-testid="w3m-usage-exceeded-button"
        >
          <wui-icon color="inherit" slot="iconLeft" name="refresh"></wui-icon>
          Try Again
        </wui-button>
      </wui-flex>
    `}onTryAgainClick(){w.goBack()}};tt.styles=Io,tt=Eo([x("w3m-usage-exceeded-view")],tt);const Po=S`
  :host {
    width: 100%;
  }
`;var U=function(e,t,i,a){var r=arguments.length,o=r<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};let N=class extends T{constructor(){super(...arguments),this.hasImpressionSent=!1,this.walletImages=[],this.imageSrc="",this.name="",this.size="md",this.tabIdx=void 0,this.disabled=!1,this.showAllWallets=!1,this.loading=!1,this.loadingSpinnerColor="accent-100",this.rdnsId="",this.displayIndex=void 0,this.walletRank=void 0,this.namespaces=[]}connectedCallback(){super.connectedCallback()}disconnectedCallback(){super.disconnectedCallback(),this.cleanupIntersectionObserver()}updated(e){super.updated(e),(e.has("name")||e.has("imageSrc")||e.has("walletRank"))&&(this.hasImpressionSent=!1),e.has("walletRank")&&this.walletRank&&!this.intersectionObserver&&this.setupIntersectionObserver()}setupIntersectionObserver(){this.intersectionObserver=new IntersectionObserver(e=>{e.forEach(t=>{t.isIntersecting&&!this.loading&&!this.hasImpressionSent&&this.sendImpressionEvent()})},{threshold:.1}),this.intersectionObserver.observe(this)}cleanupIntersectionObserver(){this.intersectionObserver&&(this.intersectionObserver.disconnect(),this.intersectionObserver=void 0)}sendImpressionEvent(){!this.name||this.hasImpressionSent||!this.walletRank||(this.hasImpressionSent=!0,(this.rdnsId||this.name)&&q.sendWalletImpressionEvent({name:this.name,walletRank:this.walletRank,rdnsId:this.rdnsId,view:w.state.view,displayIndex:this.displayIndex}))}handleGetWalletNamespaces(){return Object.keys(oi.state.adapters).length>1?this.namespaces:[]}render(){return c`
      <wui-list-wallet
        .walletImages=${this.walletImages}
        imageSrc=${A(this.imageSrc)}
        name=${this.name}
        size=${A(this.size)}
        tagLabel=${A(this.tagLabel)}
        .tagVariant=${this.tagVariant}
        .walletIcon=${this.walletIcon}
        .tabIdx=${this.tabIdx}
        .disabled=${this.disabled}
        .showAllWallets=${this.showAllWallets}
        .loading=${this.loading}
        loadingSpinnerColor=${this.loadingSpinnerColor}
        .namespaces=${this.handleGetWalletNamespaces()}
      ></wui-list-wallet>
    `}};N.styles=Po,U([u({type:Array})],N.prototype,"walletImages",void 0),U([u()],N.prototype,"imageSrc",void 0),U([u()],N.prototype,"name",void 0),U([u()],N.prototype,"size",void 0),U([u()],N.prototype,"tagLabel",void 0),U([u()],N.prototype,"tagVariant",void 0),U([u()],N.prototype,"walletIcon",void 0),U([u()],N.prototype,"tabIdx",void 0),U([u({type:Boolean})],N.prototype,"disabled",void 0),U([u({type:Boolean})],N.prototype,"showAllWallets",void 0),U([u({type:Boolean})],N.prototype,"loading",void 0),U([u({type:String})],N.prototype,"loadingSpinnerColor",void 0),U([u()],N.prototype,"rdnsId",void 0),U([u()],N.prototype,"displayIndex",void 0),U([u()],N.prototype,"walletRank",void 0),U([u({type:Array})],N.prototype,"namespaces",void 0),N=U([x("w3m-list-wallet")],N);const Co=S`
  :host {
    --local-duration-height: 0s;
    --local-duration: ${({durations:e})=>e.lg};
    --local-transition: ${({easings:e})=>e["ease-out-power-2"]};
  }

  .container {
    display: block;
    overflow: hidden;
    overflow: hidden;
    position: relative;
    height: var(--local-container-height);
    transition: height var(--local-duration-height) var(--local-transition);
    will-change: height, padding-bottom;
  }

  .container[data-mobile-fullscreen='true'] {
    overflow: scroll;
  }

  .page {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: auto;
    width: inherit;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    border-bottom-left-radius: var(--local-border-bottom-radius);
    border-bottom-right-radius: var(--local-border-bottom-radius);
    transition: border-bottom-left-radius var(--local-duration) var(--local-transition);
  }

  .page[data-mobile-fullscreen='true'] {
    height: 100%;
  }

  .page-content {
    display: flex;
    flex-direction: column;
    min-height: 100%;
  }

  .footer {
    height: var(--apkt-footer-height);
  }

  div.page[view-direction^='prev-'] .page-content {
    animation:
      slide-left-out var(--local-duration) forwards var(--local-transition),
      slide-left-in var(--local-duration) forwards var(--local-transition);
    animation-delay: 0ms, var(--local-duration, ${({durations:e})=>e.lg});
  }

  div.page[view-direction^='next-'] .page-content {
    animation:
      slide-right-out var(--local-duration) forwards var(--local-transition),
      slide-right-in var(--local-duration) forwards var(--local-transition);
    animation-delay: 0ms, var(--local-duration, ${({durations:e})=>e.lg});
  }

  @keyframes slide-left-out {
    from {
      transform: translateX(0px) scale(1);
      opacity: 1;
      filter: blur(0px);
    }
    to {
      transform: translateX(8px) scale(0.99);
      opacity: 0;
      filter: blur(4px);
    }
  }

  @keyframes slide-left-in {
    from {
      transform: translateX(-8px) scale(0.99);
      opacity: 0;
      filter: blur(4px);
    }
    to {
      transform: translateX(0) translateY(0) scale(1);
      opacity: 1;
      filter: blur(0px);
    }
  }

  @keyframes slide-right-out {
    from {
      transform: translateX(0px) scale(1);
      opacity: 1;
      filter: blur(0px);
    }
    to {
      transform: translateX(-8px) scale(0.99);
      opacity: 0;
      filter: blur(4px);
    }
  }

  @keyframes slide-right-in {
    from {
      transform: translateX(8px) scale(0.99);
      opacity: 0;
      filter: blur(4px);
    }
    to {
      transform: translateX(0) translateY(0) scale(1);
      opacity: 1;
      filter: blur(0px);
    }
  }
`;var ne=function(e,t,i,a){var r=arguments.length,o=r<3?t:a===null?a=Object.getOwnPropertyDescriptor(t,i):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(e,t,i,a);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(o=(r<3?n(o):r>3?n(t,i,o):n(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o};const $o=60;let G=class extends T{constructor(){super(...arguments),this.resizeObserver=void 0,this.transitionDuration="0.15s",this.transitionFunction="",this.history="",this.view="",this.setView=void 0,this.viewDirection="",this.historyState="",this.previousHeight="0px",this.mobileFullScreen=P.state.enableMobileFullScreen,this.onViewportResize=()=>{this.updateContainerHeight()}}updated(e){if(e.has("history")){const t=this.history;this.historyState!==""&&this.historyState!==t&&this.onViewChange(t)}e.has("transitionDuration")&&this.style.setProperty("--local-duration",this.transitionDuration),e.has("transitionFunction")&&this.style.setProperty("--local-transition",this.transitionFunction)}firstUpdated(){var e;this.transitionFunction&&this.style.setProperty("--local-transition",this.transitionFunction),this.style.setProperty("--local-duration",this.transitionDuration),this.historyState=this.history,this.resizeObserver=new ResizeObserver(t=>{var i;for(const a of t)if(a.target===this.getWrapper()){let r=a.contentRect.height;const o=parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--apkt-footer-height")||"0");if(this.mobileFullScreen){const n=((i=window.visualViewport)==null?void 0:i.height)||window.innerHeight,s=this.getHeaderHeight();r=n-s-o,this.style.setProperty("--local-border-bottom-radius","0px")}else r=r+o,this.style.setProperty("--local-border-bottom-radius",o?"var(--apkt-borderRadius-5)":"0px");this.style.setProperty("--local-container-height",`${r}px`),this.previousHeight!=="0px"&&this.style.setProperty("--local-duration-height",this.transitionDuration),this.previousHeight=`${r}px`}}),this.resizeObserver.observe(this.getWrapper()),this.updateContainerHeight(),window.addEventListener("resize",this.onViewportResize),(e=window.visualViewport)==null||e.addEventListener("resize",this.onViewportResize)}disconnectedCallback(){var t;const e=this.getWrapper();e&&this.resizeObserver&&this.resizeObserver.unobserve(e),window.removeEventListener("resize",this.onViewportResize),(t=window.visualViewport)==null||t.removeEventListener("resize",this.onViewportResize)}render(){return c`
      <div class="container" data-mobile-fullscreen="${A(this.mobileFullScreen)}">
        <div
          class="page"
          data-mobile-fullscreen="${A(this.mobileFullScreen)}"
          view-direction="${this.viewDirection}"
        >
          <div class="page-content">
            <slot></slot>
          </div>
        </div>
      </div>
    `}onViewChange(e){const t=e.split(",").filter(Boolean),i=this.historyState.split(",").filter(Boolean),a=i.length,r=t.length,o=t[t.length-1]||"",n=Ve.cssDurationToNumber(this.transitionDuration);let s="";r>a?s="next":r<a?s="prev":r===a&&t[r-1]!==i[a-1]&&(s="next"),this.viewDirection=`${s}-${o}`,setTimeout(()=>{var m;this.historyState=e,(m=this.setView)==null||m.call(this,o)},n),setTimeout(()=>{this.viewDirection=""},n*2)}getWrapper(){var e;return(e=this.shadowRoot)==null?void 0:e.querySelector("div.page")}updateContainerHeight(){var a;const e=this.getWrapper();if(!e)return;const t=parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--apkt-footer-height")||"0");let i=0;if(this.mobileFullScreen){const r=((a=window.visualViewport)==null?void 0:a.height)||window.innerHeight,o=this.getHeaderHeight();i=r-o-t,this.style.setProperty("--local-border-bottom-radius","0px")}else i=e.getBoundingClientRect().height+t,this.style.setProperty("--local-border-bottom-radius",t?"var(--apkt-borderRadius-5)":"0px");this.style.setProperty("--local-container-height",`${i}px`),this.previousHeight!=="0px"&&this.style.setProperty("--local-duration-height",this.transitionDuration),this.previousHeight=`${i}px`}getHeaderHeight(){return $o}};G.styles=[Co],ne([u({type:String})],G.prototype,"transitionDuration",void 0),ne([u({type:String})],G.prototype,"transitionFunction",void 0),ne([u({type:String})],G.prototype,"history",void 0),ne([u({type:String})],G.prototype,"view",void 0),ne([u({attribute:!1})],G.prototype,"setView",void 0),ne([h()],G.prototype,"viewDirection",void 0),ne([h()],G.prototype,"historyState",void 0),ne([h()],G.prototype,"previousHeight",void 0),ne([h()],G.prototype,"mobileFullScreen",void 0),G=ne([x("w3m-router-container")],G);export{Et as AppKitModal,N as W3mListWallet,It as W3mModal,Q as W3mModalBase,G as W3mRouterContainer,tt as W3mUsageExceededView};
