import { toast } from './utils.js';

export function getLocationPlatform() {
  const ua = navigator.userAgent || '';
  const isIOS =
    /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  return { isIOS, isAndroid, isMobile: isIOS || isAndroid };
}

function androidBrowserPackage() {
  const ua = navigator.userAgent || '';
  if (/SamsungBrowser/i.test(ua)) return 'com.sec.android.app.sbrowser';
  if (/Firefox/i.test(ua)) return 'org.mozilla.firefox';
  if (/EdgA/i.test(ua)) return 'com.microsoft.emmx';
  if (/OPR|Opera/i.test(ua)) return 'com.opera.browser';
  return 'com.android.chrome';
}

function isStandalonePwa() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

function launchIntent(url) {
  window.location.assign(url);
}

/** Serviços de localização / GPS do celular. */
export function openLocationServices() {
  launchIntent('intent:#Intent;action=android.settings.LOCATION_SOURCE_SETTINGS;end');
}

/** Permissões do navegador (Chrome, Samsung, etc.). */
export function openAndroidBrowserSettings() {
  const pkg = androidBrowserPackage();
  launchIntent(
    `intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:${pkg};end`,
  );
}

export function openAndroidGpsSettings() {
  openLocationServices();
}

export function openAndroidLocationSettings() {
  openLocationServices();
}

export function getIosSettingsPath() {
  if (isStandalonePwa()) {
    return 'Ajustes → Privacidade e Segurança → Serviços de Localização → Meira Fishing → Ao Usar o App';
  }
  return 'Ajustes → Privacidade e Segurança → Serviços de Localização → Safari → Permitir';
}

export async function copyIosSettingsPath() {
  const path = getIosSettingsPath();
  try {
    await navigator.clipboard.writeText(path);
    toast('Caminho copiado — abra Ajustes no iPhone.');
    return true;
  } catch {
    toast(path);
    return false;
  }
}

export async function needsLocationPermission() {
  if (!navigator.geolocation) return false;
  if (!navigator.permissions?.query) return true;
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state !== 'granted';
  } catch {
    return true;
  }
}

export function getLocationSettingsGuide() {
  const { isIOS, isAndroid } = getLocationPlatform();

  if (isAndroid) {
    return {
      title: 'Serviços de localização',
      notice: 'Ative a localização do celular e permita o navegador.',
      steps: [
        'Ligue **Usar localização** / **GPS**.',
        'Volte ao app → toque Permissões do navegador se ainda pedir.',
        'Permissões → Localização → Permitir.',
        'Toque Tentar localização de novo.',
      ],
    };
  }

  if (isIOS) {
    return {
      title: 'Serviços de localização',
      notice:
        'A Apple não abre os Ajustes automaticamente. Vá em Serviços de Localização e permita o Safari:',
      steps: isStandalonePwa()
        ? [
            'Ajustes → Privacidade e Segurança → Serviços de Localização (ligado).',
            'Role até Meira Fishing → Ao Usar o App ou Permitir.',
            'Volte ao app e toque Tentar localização de novo.',
          ]
        : [
            'Ajustes → Privacidade e Segurança → Serviços de Localização (ligado).',
            'Role até Safari → Ao Usar o App ou Permitir.',
            'Volte ao Safari, recarregue e toque Permitir no popup.',
          ],
    };
  }

  return {
    title: 'Serviços de localização',
    notice: null,
    steps: [
      'Clique no cadeado ao lado do endereço do site.',
      'Em Localização, escolha Permitir.',
      'Recarregue a página e tente de novo.',
    ],
  };
}

/** Android: abre Serviços de localização. iPhone: guia. */
export function openLocationSettings(onShowGuide) {
  const { isIOS, isAndroid } = getLocationPlatform();

  if (isAndroid) {
    openLocationServices();
    toast('Ative a localização (GPS) e volte ao app.');
    return 'android';
  }

  onShowGuide?.();
  return isIOS ? 'ios' : 'desktop';
}

/** Ao entrar no app — leva aos serviços de localização se ainda não liberou. */
export function promptLocationServicesOnEntry(onShowGuide) {
  return openLocationSettings(onShowGuide);
}

export function canOpenSettingsDirectly() {
  return getLocationPlatform().isAndroid;
}
