/* wave.radio · js/ads.js · Ad slots (house ads / AdSense). */
/* ---- ads: house ads by default, Google AdSense once you have approved ids ---- */
const ADS = {
  adsense:{client:'', slot:''},   // paste ca-pub-... and the slot id after AdSense approves your site
  house:[ // edit these or add paid sponsors. Use "href" for an outside link, or "go" for a tab inside the app
    {t:'Start your own station', d:'Pick a wave tag, add a logo and go live from your browser.', b:'Open Studio', go:'studio', c:'#8fb8ff'},
    {t:'Take a quick game break', d:'Beat your best in Memory Match, Music Quiz or Reaction Wave.', b:'Play now', go:'games', c:'#4fe3c6'},
    {t:'Find your people', d:'Add friends, follow great stations and see who is on air.', b:'Browse people', go:'people', c:'#ffbf47'}]
};
let adN = 0;
function fillAds(){
  document.querySelectorAll('[data-ad]').forEach(el => {
    if (el.dataset.f) return; el.dataset.f = 1; const A = ADS.adsense;
    if (A.client && A.slot){
      el.innerHTML = '<small class="spon">Advertisement</small><ins class="adsbygoogle" style="display:block;width:100%" data-ad-client="' + esc(A.client) + '" data-ad-slot="' + esc(A.slot) + '" data-ad-format="auto" data-full-width-responsive="true"></ins>';
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e){} return;
    }
    const a = ADS.house[adN++ % ADS.house.length]; el.style.background = a.c; el.style.color = onc(a.c);
    el.innerHTML = `<small class="spon">Ad</small><b>${esc(a.t)}</b><span>${esc(a.d)}</span>` + (a.href ? `<a class="btn dark sm" href="${esc(a.href)}" target="_blank" rel="noopener sponsored" style="text-decoration:none">${esc(a.b)}</a>` : `<button class="btn dark sm" data-go="${esc(a.go)}">${esc(a.b)}</button>`);
  });
}
if (ADS.adsense.client){ const sc = document.createElement('script'); sc.async = true; sc.crossOrigin = 'anonymous'; sc.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(ADS.adsense.client); document.head.appendChild(sc); }
