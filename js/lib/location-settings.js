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

/** Abre permissões do navegador (Chrome, Samsung, etc.). */
export function openAndroidBrowserSettings() {
  const pkg = androidBrowserPackage();
  launchIntent(
    `intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:${pkg};end`,
  );
}

/** Abre liga/desliga GPS do celular. */
export function openAndroidGpsSettings() {
  launchIntent('intent:#Intent;action=android.settings.LOCATION_SOURCE_SETTINGS;end');
}

export function openAndroidLocationSettings() {
  openAndroidBrowserSettings();
}

export function getIosSettingsPath() {
  if (isStandalonePwa()) {
    return 'Ajustes → Meira Fishing → Localização → Ao Usar o App';
  }
  return 'Ajustes → Apps → Safari → Localização → Permitir';
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

export function getLocationSettingsGuide() {
  const { isIOS, isAndroid } = getLocationPlatform();

  if (isAndroid) {
    return {
      title: 'Liberar localização no Android',
      notice: 'Toque no botão — abre direto as configurações do celular.',
      steps: [
        'Em Permissões, toque Localização → Permitir.',
        'Se o GPS estiver desligado, use o botão GPS do celular abaixo.',
        'Volte ao app e toque Tentar localização de novo.',
      ],
    };
  }

  if (isIOS) {
    return {
      title: 'Liberar localização no iPhone',
      notice:
        'A Apple não permite sites abrirem os Ajustes automaticamente. Abra Ajustes manualmente e siga os passos:',
      steps: isStandalonePwa()
        ? [
            'Abra Ajustes no iPhone.',
            'Role até Meira Fishing (ícone na tela inicial).',
            'Localização → Ao Usar o App ou Permitir.',
            'Volte ao app e toque Tentar localização de novo.',
          ]
        : [
            'Abra Ajustes → Apps → Safari.',
            'Localização → Permitir ou Ao Usar o App.',
            'Ajustes → Privacidade e Segurança → Serviços de Localização (ligado).',
            'Volte ao Safari, recarregue e toque Permitir no popup.',
          ],
    };
  }

  return {
    title: 'Liberar localização',
    notice: null,
    steps: [
      'Clique no cadeado ao lado do endereço do site.',
      'Em Localização, escolha Permitir.',
      'Recarregue a página e tente de novo.',
    ],
  };
}

/** Android: abre configurações direto. iPhone: só guia (bloqueio da Apple). */
export function openLocationSettings(onShowGuide) {
  const { isIOS, isAndroid } = getLocationPlatform();

  if (isAndroid) {
    openAndroidBrowserSettings();
    toast('Abrindo configurações… Permissões → Localização → Permitir.');
    return 'android';
  }

  onShowGuide?.();
  return isIOS ? 'ios' : 'desktop';
}

export function canOpenSettingsDirectly() {
  return getLocationPlatform().isAndroid;
}
