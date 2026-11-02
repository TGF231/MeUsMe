package app.meusme;

import android.app.PendingIntent;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.service.quicksettings.TileService;

/**
 * Bloco "Capturar" nas Configurações rápidas (V02 em docs/CONCORRENTES.md): de qualquer tela, dois toques abrem a
 * captura rápida do MeUsMe. Usa o mesmo link de entrada do compartilhamento e do atalho de voz (src/entrada.ts).
 */
public class BlocoCapturaService extends TileService {

    @Override
    public void onClick() {
        Intent abrir = new Intent(Intent.ACTION_VIEW, Uri.parse("meusme://captura?abrir=1"), this, MainActivity.class);
        abrir.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        if (Build.VERSION.SDK_INT >= 34) {
            // A partir do Android 14 o bloco só pode abrir uma tela por PendingIntent.
            startActivityAndCollapse(PendingIntent.getActivity(this, 0, abrir, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        } else {
            startActivityAndCollapse(abrir);
        }
    }
}
