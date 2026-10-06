package app.meusme;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Fila de notificações de banco capturadas enquanto o app está fechado.
 * O app web lê e esvazia a fila quando abre (CapturaPlugin.pegarCapturas).
 *
 * Privacidade: o conteúdo só é guardado para apps da lista de bancos. De outros apps que
 * mencionam "R$" guardamos apenas o nome do pacote, para o usuário poder liberá-lo se for um banco.
 */
final class Capturas {

    private static final String PREFS = "meusme_capturas";
    private static final String FILA = "fila";
    private static final String PACOTES = "pacotes";
    private static final String CANDIDATOS = "candidatos";
    private static final int LIMITE = 300;

    static final Set<String> BANCOS_PADRAO = new HashSet<>(
        Arrays.asList("com.nu.production", "br.com.intermedium", "com.mercadopago.wallet", "com.picpay", "br.com.bradesco.next")
    );

    /** Avisado quando chega uma captura com o app aberto. */
    interface Ouvinte {
        void novaCaptura();
    }

    static Ouvinte ouvinte;

    private Capturas() {}

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static Set<String> pacotes(Context c) {
        return new HashSet<>(prefs(c).getStringSet(PACOTES, BANCOS_PADRAO));
    }

    static void definirPacotes(Context c, Set<String> pacotes) {
        prefs(c).edit().putStringSet(PACOTES, pacotes).apply();
    }

    static synchronized void adicionar(Context c, String pacote, String titulo, String texto, long quando) {
        try {
            JSONArray fila = new JSONArray(prefs(c).getString(FILA, "[]"));
            // Bancos às vezes republicam a mesma notificação; ignora repetida em 10 minutos.
            for (int i = 0; i < fila.length(); i++) {
                JSONObject o = fila.getJSONObject(i);
                if (
                    o.getString("pacote").equals(pacote) &&
                    o.getString("titulo").equals(titulo) &&
                    o.getString("texto").equals(texto) &&
                    Math.abs(o.getLong("quando") - quando) < 10 * 60 * 1000
                ) return;
            }
            JSONObject nova = new JSONObject();
            nova.put("pacote", pacote).put("titulo", titulo).put("texto", texto).put("quando", quando);
            fila.put(nova);
            while (fila.length() > LIMITE) fila.remove(0);
            prefs(c).edit().putString(FILA, fila.toString()).apply();
        } catch (JSONException ignorada) {
            prefs(c).edit().remove(FILA).apply();
        }
        if (ouvinte != null) ouvinte.novaCaptura();
    }

    static synchronized JSONArray retirarTodas(Context c) {
        try {
            JSONArray fila = new JSONArray(prefs(c).getString(FILA, "[]"));
            prefs(c).edit().remove(FILA).apply();
            return fila;
        } catch (JSONException e) {
            prefs(c).edit().remove(FILA).apply();
            return new JSONArray();
        }
    }

    static synchronized void anotarCandidato(Context c, String pacote) {
        try {
            JSONObject candidatos = new JSONObject(prefs(c).getString(CANDIDATOS, "{}"));
            candidatos.put(pacote, candidatos.optInt(pacote, 0) + 1);
            prefs(c).edit().putString(CANDIDATOS, candidatos.toString()).apply();
        } catch (JSONException ignorada) {
            prefs(c).edit().remove(CANDIDATOS).apply();
        }
    }

    static JSONObject candidatos(Context c) {
        try {
            return new JSONObject(prefs(c).getString(CANDIDATOS, "{}"));
        } catch (JSONException e) {
            return new JSONObject();
        }
    }
}
