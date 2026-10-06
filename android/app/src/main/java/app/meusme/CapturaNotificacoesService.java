package app.meusme;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

/**
 * Recebe as notificações do celular (depois que o usuário libera "Acesso a notificações")
 * e guarda as dos apps de banco, para virarem lançamentos no MeUsMe.
 * Funciona com o app fechado: o Android mantém este serviço ligado.
 */
public class CapturaNotificacoesService extends NotificationListenerService {

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        String pacote = sbn.getPackageName();
        if (pacote.equals(getPackageName()) || sbn.isOngoing()) return;
        Notification n = sbn.getNotification();
        if ((n.flags & Notification.FLAG_GROUP_SUMMARY) != 0) return;

        Bundle extras = n.extras;
        String titulo = texto(extras.getCharSequence(Notification.EXTRA_TITLE));
        String texto = texto(extras.getCharSequence(Notification.EXTRA_BIG_TEXT));
        if (texto.isEmpty()) texto = texto(extras.getCharSequence(Notification.EXTRA_TEXT));
        if (!(titulo + " " + texto).contains("R$")) return;

        if (Capturas.pacotes(this).contains(pacote)) {
            Capturas.adicionar(this, pacote, titulo, texto, sbn.getPostTime());
        } else {
            Capturas.anotarCandidato(this, pacote);
        }
    }

    private static String texto(CharSequence cs) {
        return cs == null ? "" : cs.toString().trim();
    }
}
