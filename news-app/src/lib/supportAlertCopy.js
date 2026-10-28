const copy = {
  en: { title: 'Chat alerts', off: 'Notify me', on: "You'll be notified", enable: 'Enable chat alerts', disable: 'Mute chat alerts', unread: 'messages awaiting attention', open: 'Open chat', message: 'New message', guest: 'Website visitor', reconnecting: 'Chat alerts are reconnecting…' },
  vi: { title: 'Thông báo trò chuyện', off: 'Báo cho tôi', on: 'Sẽ nhận thông báo', enable: 'Bật thông báo trò chuyện', disable: 'Tắt thông báo trò chuyện', unread: 'tin nhắn cần xem', open: 'Mở trò chuyện', message: 'Tin nhắn mới', guest: 'Khách truy cập', reconnecting: 'Đang kết nối lại thông báo trò chuyện…' },
  de: { title: 'Chat-Benachrichtigungen', off: 'Benachrichtigen', on: 'Benachrichtigungen aktiv', enable: 'Chat-Benachrichtigungen aktivieren', disable: 'Chat-Benachrichtigungen stummschalten', unread: 'Nachrichten warten', open: 'Chat öffnen', message: 'Neue Nachricht', guest: 'Website-Besucher', reconnecting: 'Chat-Benachrichtigungen werden neu verbunden…' },
  fr: { title: 'Alertes de discussion', off: 'Me notifier', on: 'Notifications activées', enable: 'Activer les alertes de discussion', disable: 'Désactiver les alertes de discussion', unread: 'messages à consulter', open: 'Ouvrir', message: 'Nouveau message', guest: 'Visiteur du site', reconnecting: 'Reconnexion des alertes de discussion…' },
  ko: { title: '채팅 알림', off: '알림 받기', on: '알림이 켜졌습니다', enable: '채팅 알림 켜기', disable: '채팅 알림 끄기', unread: '확인이 필요한 메시지', open: '채팅 열기', message: '새 메시지', guest: '사이트 방문자', reconnecting: '채팅 알림에 다시 연결하는 중…' },
  ja: { title: 'チャット通知', off: '通知を受け取る', on: '通知は有効です', enable: 'チャット通知を有効にする', disable: 'チャット通知をミュートする', unread: '件の確認待ちメッセージ', open: 'チャットを開く', message: '新着メッセージ', guest: 'サイト訪問者', reconnecting: 'チャット通知に再接続しています…' },
}

export function supportAlertCopy(locale = 'en') {
  return copy[String(locale).split('-')[0]] || copy.en
}
