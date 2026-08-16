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

export function openAndroidLocationSettings() {
  const pkg = androidBrowserPackage();
  const fallback = encodeURIComponent(window.location.href);
  const url = `intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;scheme=package;package=${pkg};S.browser_fallback_url=${fallback};end`;
  window.location.href = url;
}

export function tryOpenIosSettings() {
  const urls = ['App-prefs:Privacy&path=LOCATION', 'app-settings:', 'prefs:root=Privacy&path=LOCATION'];
  for (const url of urls) {
    try {
      window.location.assign(url);
      return true;
    } catch {
      /* tenta próximo */
    }
  }
  return false;
}

function isStandalonePwa() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

export function getLocationSettingsGuide() {
  const { isIOS, isAndroid } = getLocationPlatform();

  if (isAndroid) {
    return {
      title: 'Liberar localização no Android',
      openLabel: 'Abrir configurações de localização',
      steps: [
        'Toque no botão abaixo — abre as configurações do navegador.',
        'Em Permissões, toque Localização → Permitir.',
        'Se o GPS do celular estiver desligado: Ajustes → Localização → Usar localização.',
        'Volte aqui e toque Tentar localização de novo.',
      ],
      opensDirect: true,
    };
  }

  if (isIOS) {
    if (isStandalonePwa()) {
      return {
        title: 'Liberar localização no iPhone',
        openLabel: 'Tentar abrir Ajustes',
        steps: [
          'Abra Ajustes no iPhone.',
          'Role até Meira Fishing (ícone na tela inicial).',
          'Toque Localização → Ao Usar o App ou Permitir.',
          'Volte ao app e toque Tentar localização de novo.',
        ],
        opensDirect: false,
      };
    }
    return {
      title: 'Liberar localização no iPhone',
      openLabel: 'Tentar abrir Ajustes',
      steps: [
        'Abra Ajustes → Apps → Safari.',
        'Toque Localização → Permitir ou Ao Usar o App.',
        'Confira: Ajustes → Privacidade e Segurança → Serviços de Localização (ligado).',
        'Volte ao Safari, recarregue a página e toque Permitir no popup.',
      ],
      opensDirect: false,
    };
  }

  return {
    title: 'Liberar localização',
    openLabel: null,
    steps: [
      'Clique no cadeado ao lado do endereço do site.',
      'Em Localização, escolha Permitir.',
      'Recarregue a página e tente de novo.',
    ],
    opensDirect: false,
  };
}

/** Abre configurações no Android ou guia no iPhone. */
export function openLocationSettings(onShowGuide) {
  const { isIOS, isAndroid } = getLocationPlatform();

  if (isAndroid) {
    openAndroidLocationSettings();
    toast('Permissões → Localização → Permitir.');
    return 'android';
  }

  if (isIOS) {
    tryOpenIosSettings();
    onShowGuide?.();
    return 'ios';
  }

  onShowGuide?.();
  return 'desktop';
}
