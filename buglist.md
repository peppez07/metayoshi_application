Bug conosciuti da risolvere
1. Navigazione errata dopo invio transazione

Quando seleziono una moneta e premo Invio, la navigazione torna indietro passando prima da Send Hub e poi nuovamente alla pagina di Ethereum.
Questo comportamento non è corretto.

Comportamento atteso:
Dopo l'invio della transazione, l'applicazione dovrebbe tornare direttamente alla pagina della moneta precedentemente selezionata, senza passare dal Send Hub.

2. Funzione Swap non funzionante

La funzionalità Swap è attualmente instabile e non funziona correttamente.

Problema:
Il sistema tenta di calcolare le coppie e i dati di swap internamente al wallet.

Soluzione proposta:
La lista delle coppie e dei parametri di swap dovrebbe essere ricevuta da un servizio esterno/API, invece di essere calcolata localmente.

Stato:
La funzionalità deve essere completamente rivista.

3. Apertura del wallet dal sito

Quando il wallet viene aperto dal sito web, si apre in una nuova pagina del browser invece che nella sidebar del sito.

Comportamento atteso:
Il wallet dovrebbe aprirsi direttamente nella sidebar, come previsto dal design dell'applicazione.

4. Calcolo delle network fee

Il valore Estimated Network Fee viene calcolato solo dopo aver inserito un indirizzo valido per ogni moneta.

Problema:
Finché non viene inserito un indirizzo, il valore non viene mostrato.

Comportamento atteso:
Dovrebbe essere utilizzato un indirizzo di default per ogni moneta, così da mostrare una stima iniziale della fee anche prima dell'inserimento dell'indirizzo reale.

5. Asset non visibili nella rete BSC

Gli asset e token della rete BSC (Binance Smart Chain) non vengono visualizzati correttamente nel wallet.

Stato:
Verificare il sistema di indicizzazione o il provider utilizzato per il recupero dei token.

6. Problemi con la rete Dash

La rete Dash continua a presentare problemi.

Problema:
Il nodo pubblico utilizzato dal server spesso fallisce oppure le richieste API scadono.

Possibile soluzione:
Valutare la configurazione di un nuovo nodo pubblico o di un nodo dedicato.