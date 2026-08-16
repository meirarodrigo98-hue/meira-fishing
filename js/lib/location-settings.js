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

function openIntent(url) {
  const a = document.createElement('a');
  a.href = url;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function openAndroidLocationSettings() {
  const pkg = androidBrowserPackage();
  openIntent(
    `intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;scheme=package;package=${pkg};end`,
  );
}

function isStandalonePwa() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

export function getLocationSettingsGuide() {
  const { isIOS, isAndroid } = getLocationPlatform();

  if (isAndroid) {
    return {
      title: 'Liberar localização no Android',
      openLabel: 'Abrir configurações do celular',
      steps: [
        'Toque no botão abaixo — abre as configurações do navegador.',
        'Em Permissões, toque Localização → Permitir.',
        'Se o GPS estiver desligado: Configurações → Localização → Usar localização.',
        'Volte aqui e toque Tentar localização de novo.',
      ],
    };
  }

  if (isIOS) {
    if (isStandalonePwa()) {
      return {
        title: 'Liberar localização no iPhone',
        openLabel: null,
        steps: [
          'Saia do app e abra Ajustes no iPhone.',
          'Role até Meira Fishing (ícone na tela inicial).',
          'Toque Localização → Ao Usar o App ou Permitir.',
          'Volte ao app e toque Tentar localização de novo.',
        ],
      };
    }
    return {
      title: 'Liberar localização no iPhone',
      openLabel: null,
      steps: [
        'Saia do Safari e abra Ajustes no iPhone.',
        'Toque Apps → Safari → Localização → Permitir ou Ao Usar o App.',
        'Confira também: Ajustes → Privacidade e Segurança → Serviços de Localização (ligado).',
        'Volte ao Safari, recarregue a página e toque Permitir no popup.',
      ],
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
  };
}

/** Android abre configurações; iPhone mostra guia (Safari não permite abrir Ajustes). */
export function openLocationSettings(onShowGuide) {
  const { isIOS, isAndroid } = getLocationPlatform();

  if (isAndroid) {
    openAndroidLocationSettings();
    toast('Permissões → Localização → Permitir.');
    return 'android';
  }

  onShowGuide?.();
  return isIOS ? 'ios' : 'desktop';
}
