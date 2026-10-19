// Service worker de OneSignal (SDK web v16). Es el que recibe las
// notificaciones push cuando la web no está abierta.
//
// Tiene que estar EN LA RAÍZ del dominio (/OneSignalSDKWorker.js) y con
// este nombre exacto: es donde lo busca el SDK por defecto. Por eso vive en
// public/ y no se toca.
//
// ⚠️ Una vez que un navegador registra un service worker en una URL, cambiar
// esa URL obliga a una migración. No lo muevas de sitio.
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js')
