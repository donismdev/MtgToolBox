window.i18n.initPromise.then(() => {
    function calculateMighty(){
        var e=parseInt(document.getElementById("bidNumber").value),t=document.getElementById("suitSelect").value;
        let s=window.i18n.t('aceOfSpades'),n=window.i18n.t('geomma'),a=window.i18n.t('threeOfClubs'),r=window.i18n.t('threeKkul'),o=window.i18n.t('noTrump');
        var p=[];
        switch(t){
            case"spade":s=window.i18n.t('aceOfDiamonds'),n=window.i18n.t('noma'),a=window.i18n.t('threeOfClubs'),r=window.i18n.t('threeKkul'),o=`${window.i18n.t('spade')}`;break;
            case"club":s=window.i18n.t('aceOfSpades'),n=window.i18n.t('geomma'),a=window.i18n.t('threeOfSpades'),r=window.i18n.t('threeKkul'),o=`${window.i18n.t('club')}`;break;
            case"heart":n=window.i18n.t('geomma'),o=`${window.i18n.t('heart')}`;break;
            case"diamond":n=window.i18n.t('geomma'),o=`${window.i18n.t('diamond')}`;break;
            case"none":o=`${window.i18n.t('noSuit')}`,p.push(window.i18n.t('noTrumpBonus'));
        }
        20===e&&"none"!==t&&p.push(window.i18n.t('fullBonus'));
        document.getElementById("result").innerHTML=`
            <div class="space-y-2">
                <p><strong>${window.i18n.t('resultTrump')}</strong> ${o}</p>
                <p><strong>${window.i18n.t('resultBid')}</strong> ${e}</p>
                <p><strong>${window.i18n.t('resultMighty')}</strong> ${s} <span class="text-gray-500 dark:text-gray-400">(${n})</span></p>
                <p><strong>${window.i18n.t('resultJokerCall')}</strong> ${a} <span class="text-gray-500 dark:text-gray-400">(${r})</span></p>
                ${p.map(e=>`<p class="text-green-600 font-semibold">${e}</p>`).join("")}
            </div>
        `
    }
    window.calculateMighty = calculateMighty;
});
