"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

/**
 * Optional direct tags for when GTM is NOT used (if NEXT_PUBLIC_GTM_ID is set, configure tags in GTM instead).
 *  - GA4 / Google Ads via gtag.js: NEXT_PUBLIC_GA4_ID, NEXT_PUBLIC_GOOGLE_ADS_ID (+ _LEAD_LABEL / _PURCHASE_LABEL)
 *  - Meta Pixel: NEXT_PUBLIC_META_PIXEL_ID — loads ONLY after advertising consent; GPC always blocks.
 *  - Intent vendor pixel (DataMoon / AudienceLab): NEXT_PUBLIC_INTENT_PIXEL_SRC + NEXT_PUBLIC_INTENT_ENABLED=true, ads consent only.
 * Nothing renders when the IDs are absent, so staging and production stay inert until configured.
 */
const GA4 = process.env.NEXT_PUBLIC_GA4_ID;
const ADS = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const META = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const GTM = process.env.NEXT_PUBLIC_GTM_ID;
const INTENT_SRC = process.env.NEXT_PUBLIC_INTENT_ENABLED === "true" ? process.env.NEXT_PUBLIC_INTENT_PIXEL_SRC : undefined;

function readAdsConsent() {
  try {
    if ((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true) return false;
    const s = JSON.parse(localStorage.getItem("bga_consent") || "null") as { ads?: boolean } | null;
    return s ? Boolean(s.ads) : process.env.NEXT_PUBLIC_CONSENT_DEFAULT === "granted";
  } catch { return false; }
}

export function MarketingTags() {
  const [ads, setAds] = useState(false);
  useEffect(() => {
    setAds(readAdsConsent());
    const onChange = () => setAds(readAdsConsent());
    window.addEventListener("bga:consent-changed", onChange);
    return () => window.removeEventListener("bga:consent-changed", onChange);
  }, []);
  const gtagId = !GTM ? GA4 || ADS : undefined;
  const def = process.env.NEXT_PUBLIC_CONSENT_DEFAULT === "granted" ? "granted" : "denied";
  return (
    <>
      {gtagId && (
        <>
          <Script id="gtag-consent" strategy="afterInteractive">{`
            window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
            var s=null;try{s=JSON.parse(localStorage.getItem('bga_consent')||'null')}catch(e){}
            var a=s?(s.analytics?'granted':'denied'):'${def}', d=s?(s.ads?'granted':'denied'):'${def}';
            if(navigator.globalPrivacyControl===true){d='denied';}
            gtag('consent','default',{analytics_storage:a,ad_storage:d,ad_user_data:d,ad_personalization:d,wait_for_update:500});
            gtag('js',new Date());
            ${GA4 ? `gtag('config','${GA4}',{send_page_view:true});` : ""}
            ${ADS ? `gtag('config','${ADS}');` : ""}
          `}</Script>
          <Script id="gtag-js" strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${gtagId}`} />
        </>
      )}
      {META && ads && !GTM && (
        <Script id="meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','${META}');fbq('track','PageView');
        `}</Script>
      )}
      {INTENT_SRC && ads && <Script id="intent-pixel" strategy="lazyOnload" src={INTENT_SRC} />}
    </>
  );
}
