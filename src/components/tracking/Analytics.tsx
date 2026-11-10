import Script from "next/script";
import { oaiqSnippet } from "@/lib/openai-ads/client";

/**
 * Loads Google Tag Manager with Consent Mode v2 defaults set BEFORE GTM runs.
 * GA4, Google Ads and Meta Pixel are configured inside GTM (docs/09-tracking-plan.md).
 * Renders nothing if NEXT_PUBLIC_GTM_ID is not set.
 */
export function Analytics() {
  const gtm = process.env.NEXT_PUBLIC_GTM_ID;
  const def = process.env.NEXT_PUBLIC_CONSENT_DEFAULT === "granted" ? "granted" : "denied";
  const openaiPixel = process.env.NEXT_PUBLIC_OPENAI_PIXEL_ID;
  const pixel = openaiPixel ? (
    // OpenAI Ads (ChatGPT) pixel: consent set before init from the stored choice / site default; GPC always blocks.
    <Script id="openai-pixel" strategy="afterInteractive">{oaiqSnippet(openaiPixel, `(function(){if(navigator.globalPrivacyControl===true)return false;var s=null;try{s=JSON.parse(localStorage.getItem('bga_consent')||'null')}catch(e){}return s?!!s.ads:${def === "granted"};})()`)}</Script>
  ) : null;
  if (!gtm) return pixel;
  return (
    <>
      {pixel}
      <Script id="consent-default" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        var stored = null; try { stored = JSON.parse(localStorage.getItem('bga_consent')||'null'); } catch(e){}
        gtag('consent','default',{
          analytics_storage: stored ? (stored.analytics?'granted':'denied') : '${def}',
          ad_storage: stored ? (stored.ads?'granted':'denied') : '${def}',
          ad_user_data: stored ? (stored.ads?'granted':'denied') : '${def}',
          ad_personalization: stored ? (stored.ads?'granted':'denied') : '${def}',
          wait_for_update: 500
        });
        gtag('set','ads_data_redaction', true);
        gtag('set','url_passthrough', true);
      `}</Script>
      <Script id="gtm" strategy="afterInteractive">{`
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
        var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
        j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${gtm}');
      `}</Script>
    </>
  );
}

export function GtmNoScript() {
  const gtm = process.env.NEXT_PUBLIC_GTM_ID;
  if (!gtm) return null;
  return (
    <noscript>
      <iframe src={`https://www.googletagmanager.com/ns.html?id=${gtm}`} height="0" width="0" style={{ display: "none", visibility: "hidden" }} title="gtm" />
    </noscript>
  );
}
