package app.meusme;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugins locais devem ser registrados antes de super.onCreate.
        registerPlugin(CapturaPlugin.class);
        setIntent(comoLink(getIntent()));
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(comoLink(intent));
    }

    /**
     * "Compartilhar com o MeUsMe" vira o link meusme://captura?texto=…, que o plugin App do Capacitor entrega ao JS
     * (appUrlOpen e getLaunchUrl). Assim o compartilhamento e o atalho de voz seguem o mesmo caminho (src/entrada.ts).
     */
    private static Intent comoLink(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction()) || !"text/plain".equals(intent.getType())) return intent;
        String texto = intent.getStringExtra(Intent.EXTRA_TEXT);
        String assunto = intent.getStringExtra(Intent.EXTRA_SUBJECT);
        if (texto == null && assunto == null) return intent;
        Uri.Builder link = new Uri.Builder().scheme("meusme").authority("captura");
        if (assunto != null) link.appendQueryParameter("titulo", assunto);
        if (texto != null) link.appendQueryParameter("texto", texto);
        return new Intent(Intent.ACTION_VIEW, link.build());
    }
}
