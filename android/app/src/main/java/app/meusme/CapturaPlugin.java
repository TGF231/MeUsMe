package app.meusme;

import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** Ponte entre o app web e a captura de notificações de banco. */
@CapacitorPlugin(name = "Captura")
public class CapturaPlugin extends Plugin {

    @Override
    public void load() {
        Capturas.ouvinte = () -> notifyListeners("captura", new JSObject());
    }

    @Override
    protected void handleOnDestroy() {
        Capturas.ouvinte = null;
    }

    @PluginMethod
    public void estado(PluginCall call) {
        boolean permitido = NotificationManagerCompat.getEnabledListenerPackages(getContext()).contains(getContext().getPackageName());
        JSObject r = new JSObject();
        r.put("permitido", permitido);
        r.put("pacotes", new JSArray(Capturas.pacotes(getContext())));
        call.resolve(r);
    }

    /** Abre a tela do Android onde o usuário libera o acesso às notificações. */
    @PluginMethod
    public void abrirAjustes(PluginCall call) {
        Intent i;
        if (android.os.Build.VERSION.SDK_INT >= 30) {
            i = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS);
            i.putExtra(
                Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME,
                new ComponentName(getContext(), CapturaNotificacoesService.class).flattenToString()
            );
        } else {
            i = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        }
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(i);
        } catch (Exception e) {
            Intent geral = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(geral);
        }
        call.resolve();
    }

    /** Tela de informações do app: é por ela que se libera "configurações restritas" em apps instalados por APK. */
    @PluginMethod
    public void abrirInfoDoApp(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getContext().getPackageName()));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }

    @PluginMethod
    public void definirPacotes(PluginCall call) {
        JSArray lista = call.getArray("pacotes", new JSArray());
        Set<String> pacotes = new HashSet<>();
        try {
            for (int i = 0; i < lista.length(); i++) pacotes.add(lista.getString(i));
        } catch (JSONException e) {
            call.reject("Lista de apps inválida");
            return;
        }
        Capturas.definirPacotes(getContext(), pacotes);
        call.resolve();
    }

    @PluginMethod
    public void pegarCapturas(PluginCall call) {
        JSArray capturas = new JSArray();
        JSONArray fila = Capturas.retirarTodas(getContext());
        for (int i = 0; i < fila.length(); i++) {
            JSONObject o = fila.optJSONObject(i);
            if (o != null) capturas.put(o);
        }
        JSObject r = new JSObject();
        r.put("capturas", capturas);
        call.resolve(r);
    }

    /** Apps fora da lista que mandaram notificações com "R$" (só nome e quantidade, sem conteúdo). */
    @PluginMethod
    public void candidatos(PluginCall call) {
        JSONObject c = Capturas.candidatos(getContext());
        PackageManager pm = getContext().getPackageManager();
        JSArray lista = new JSArray();
        Iterator<String> chaves = c.keys();
        while (chaves.hasNext()) {
            String pacote = chaves.next();
            String nome = pacote;
            try {
                ApplicationInfo info = pm.getApplicationInfo(pacote, 0);
                nome = pm.getApplicationLabel(info).toString();
            } catch (PackageManager.NameNotFoundException ignorada) {
                // Sem visibilidade do pacote: mostra o nome técnico.
            }
            JSObject o = new JSObject();
            o.put("pacote", pacote);
            o.put("nome", nome);
            o.put("vezes", c.optInt(pacote, 0));
            lista.put(o);
        }
        JSObject r = new JSObject();
        r.put("candidatos", lista);
        call.resolve(r);
    }
}
