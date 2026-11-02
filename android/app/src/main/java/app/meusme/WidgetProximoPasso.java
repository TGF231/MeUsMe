package app.meusme;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;

/**
 * Widget "Próximo passo" (V01 em docs/CONCORRENTES.md): o passo que a tela Agora sugere e dois botões de captura,
 * sem abrir o app antes. O texto vem do app web pelo CapturaPlugin.widget sempre que a fila muda; os botões usam
 * o mesmo link de entrada do bloco e do atalho de voz (src/entrada.ts).
 */
public class WidgetProximoPasso extends AppWidgetProvider {

    private static final String PREFS = "meusme_widget";

    /** Guarda o texto mostrado e redesenha os widgets que estiverem na tela inicial. */
    static void definir(Context ctx, String rotulo, String passo) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("rotulo", rotulo).putString("passo", passo).apply();
        AppWidgetManager gerente = AppWidgetManager.getInstance(ctx);
        int[] ids = gerente.getAppWidgetIds(new ComponentName(ctx, WidgetProximoPasso.class));
        for (int id : ids) gerente.updateAppWidget(id, montar(ctx));
    }

    @Override
    public void onUpdate(Context ctx, AppWidgetManager gerente, int[] ids) {
        for (int id : ids) gerente.updateAppWidget(id, montar(ctx));
    }

    private static RemoteViews montar(Context ctx) {
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_proximo_passo);
        v.setTextViewText(R.id.widget_rotulo, prefs.getString("rotulo", ctx.getString(R.string.widget_rotulo)));
        v.setTextViewText(R.id.widget_passo, prefs.getString("passo", ctx.getString(R.string.widget_vazio)));
        v.setOnClickPendingIntent(R.id.widget_raiz, abrir(ctx, 0, null));
        v.setOnClickPendingIntent(R.id.widget_capturar, abrir(ctx, 1, "meusme://captura?abrir=1"));
        v.setOnClickPendingIntent(R.id.widget_voz, abrir(ctx, 2, "meusme://captura?voz=1"));
        return v;
    }

    /** Abre o app; com link, na captura. Um requestCode por botão para os PendingIntents não se substituírem. */
    private static PendingIntent abrir(Context ctx, int codigo, String link) {
        Intent intent = link == null
            ? new Intent(ctx, MainActivity.class)
            : new Intent(Intent.ACTION_VIEW, Uri.parse(link), ctx, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return PendingIntent.getActivity(ctx, codigo, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }
}
