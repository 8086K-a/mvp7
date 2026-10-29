package co.median.android;

import android.text.TextUtils;
import android.util.Log;
import android.webkit.JavascriptInterface;

import org.json.JSONException;
import org.json.JSONObject;

public class GoogleSignInBridge {
    private static final String TAG = "GoogleSignInBridge";
    private final MainActivity mainActivity;
    private String pendingCallback;

    public GoogleSignInBridge(MainActivity activity) {
        this.mainActivity = activity;
    }

    @JavascriptInterface
    public void signIn(String clientId, String callback) {
        Log.d(TAG, "signIn called");
        this.pendingCallback = callback;

        mainActivity.runOnUiThread(() -> {
            String resolvedClientId = TextUtils.isEmpty(clientId)
                    ? BuildConfig.NATIVE_GOOGLE_WEB_CLIENT_ID
                    : clientId;

            if (TextUtils.isEmpty(resolvedClientId)) {
                sendError("Google webClientId is not configured");
                return;
            }

            if (mainActivity.googleSignInHelper == null) {
                mainActivity.googleSignInHelper = new GoogleSignInHelper(mainActivity);
            }

            mainActivity.googleSignInHelper.initialize(resolvedClientId);
            mainActivity.googleSignInHelper.signIn(new GoogleSignInHelper.SignInCallback() {
                @Override
                public void onSuccess(String idToken, String email, String displayName) {
                    try {
                        JSONObject result = new JSONObject();
                        result.put("success", true);
                        result.put("idToken", idToken);
                        result.put("email", email);
                        result.put("displayName", displayName);
                        callJavaScript(pendingCallback, result.toString());
                    } catch (JSONException e) {
                        Log.e(TAG, "Error creating sign-in result JSON", e);
                        sendError("Failed to build sign-in result");
                    }
                }

                @Override
                public void onError(String error) {
                    sendError(error);
                }
            });
        });
    }

    @JavascriptInterface
    public void signOut(String callback) {
        Log.d(TAG, "signOut called");
        this.pendingCallback = callback;

        mainActivity.runOnUiThread(() -> {
            if (mainActivity.googleSignInHelper == null) {
                sendSuccessWithoutPayload();
                return;
            }

            mainActivity.googleSignInHelper.signOut(new GoogleSignInHelper.SignInCallback() {
                @Override
                public void onSuccess(String idToken, String email, String displayName) {
                    sendSuccessWithoutPayload();
                }

                @Override
                public void onError(String error) {
                    sendError(error);
                }
            });
        });
    }

    @JavascriptInterface
    public String getCurrentUser() {
        if (mainActivity.googleSignInHelper != null) {
            return mainActivity.googleSignInHelper.getUserInfoJson();
        }
        return null;
    }

    private void sendSuccessWithoutPayload() {
        try {
            JSONObject result = new JSONObject();
            result.put("success", true);
            callJavaScript(pendingCallback, result.toString());
        } catch (JSONException e) {
            Log.e(TAG, "Error creating sign-out result JSON", e);
        }
    }

    private void sendError(String error) {
        try {
            JSONObject result = new JSONObject();
            result.put("success", false);
            result.put("error", error);
            callJavaScript(pendingCallback, result.toString());
        } catch (JSONException e) {
            Log.e(TAG, "Error creating error JSON", e);
        }
    }

    private boolean isSafeCallbackName(String callback) {
        if (TextUtils.isEmpty(callback)) {
            return false;
        }
        return callback.matches("[A-Za-z_$][A-Za-z0-9_$.]*");
    }

    private void callJavaScript(String callback, String data) {
        if (!isSafeCallbackName(callback)) {
            Log.w(TAG, "Invalid callback name, skip JS callback");
            return;
        }

        String js = String.format(
                "if (typeof %s === 'function') { %s(%s); }",
                callback,
                callback,
                data
        );
        mainActivity.runOnUiThread(() -> mainActivity.runJavascript(js));
    }
}
