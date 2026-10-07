package app.meusme;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugins locais devem ser registrados antes de super.onCreate.
        registerPlugin(CapturaPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
