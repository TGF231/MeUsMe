package app.meusme;

import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.os.Environment;
import android.provider.MediaStore;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Cópia automática do backup (D21 em docs/CONCORRENTES.md) em Documentos/MeUsMe, fora da pasta do app: continua
 * lá se o app for desinstalado. Usa o MediaStore (Android 10 em diante), que não pede permissão de arquivos para
 * os arquivos do próprio app. Guarda as 4 cópias mais novas.
 */
final class BackupAutomatico {

    static final String PASTA = Environment.DIRECTORY_DOCUMENTS + "/MeUsMe/";
    private static final String PREFIXO = "meusme-backup-";
    private static final int MANTER = 4;

    private BackupAutomatico() {}

    /** Grava o arquivo (substitui um com o mesmo nome) e apaga as cópias além das 4 mais novas. */
    static String salvar(Context ctx, String nome, String conteudo) throws IOException {
        ContentResolver cr = ctx.getContentResolver();
        Uri colecao = MediaStore.Files.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
        List<Long> antigas = new ArrayList<>();
        String[] colunas = { MediaStore.MediaColumns._ID, MediaStore.MediaColumns.DISPLAY_NAME };
        String filtro = MediaStore.MediaColumns.RELATIVE_PATH + "=? AND " + MediaStore.MediaColumns.DISPLAY_NAME + " LIKE ?";
        try (Cursor c = cr.query(colecao, colunas, filtro, new String[] { PASTA, PREFIXO + "%" }, MediaStore.MediaColumns.DISPLAY_NAME + " DESC")) {
            int mantidas = 1; // a nova
            while (c != null && c.moveToNext()) {
                boolean mesmoNome = nome.equals(c.getString(1));
                if (mesmoNome || mantidas >= MANTER) antigas.add(c.getLong(0));
                else mantidas++;
            }
        }
        for (long id : antigas) cr.delete(ContentUris.withAppendedId(colecao, id), null, null);

        ContentValues v = new ContentValues();
        v.put(MediaStore.MediaColumns.DISPLAY_NAME, nome);
        v.put(MediaStore.MediaColumns.MIME_TYPE, "application/json");
        v.put(MediaStore.MediaColumns.RELATIVE_PATH, PASTA);
        Uri uri = cr.insert(colecao, v);
        if (uri == null) throw new IOException("O Android não criou o arquivo do backup.");
        try (OutputStream saida = cr.openOutputStream(uri)) {
            if (saida == null) throw new IOException("O Android não abriu o arquivo do backup.");
            saida.write(conteudo.getBytes(StandardCharsets.UTF_8));
        }
        return PASTA + nome;
    }
}
