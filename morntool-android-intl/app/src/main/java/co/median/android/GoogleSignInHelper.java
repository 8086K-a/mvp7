package co.median.android;

import android.app.Activity;
import android.content.Intent;
import android.text.TextUtils;
import android.util.Log;

import androidx.annotation.NonNull;

import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.CommonStatusCodes;
import com.google.android.gms.tasks.Task;

import org.json.JSONException;
import org.json.JSONObject;

public class GoogleSignInHelper {
    private static final String TAG = "GoogleSignInHelper";
    private static final int RC_SIGN_IN = 9001;
    private static final int STATUS_DEVELOPER_ERROR = 10;

    private final Activity activity;
    private GoogleSignInClient googleSignInClient;
    private SignInCallback callback;
    private String lastClientId = "";

    public interface SignInCallback {
        void onSuccess(String idToken, String email, String displayName);
        void onError(String error);
    }

    public GoogleSignInHelper(Activity activity) {
        this.activity = activity;
    }

    public void initialize(String clientId) {
        if (TextUtils.isEmpty(clientId)) {
            googleSignInClient = null;
            lastClientId = "";
            Log.e(TAG, "Google Sign-In initialize failed: empty clientId");
            return;
        }

        lastClientId = clientId.trim();
        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(lastClientId)
                .requestEmail()
                .build();

        googleSignInClient = GoogleSignIn.getClient(activity, gso);
    }

    public void signIn(SignInCallback callback) {
        this.callback = callback;

        if (googleSignInClient == null) {
            if (callback != null) {
                callback.onError("Google Sign-In is not initialized");
            }
            return;
        }

        // Clear previous session before launching sign-in. This avoids stale account cache
        // issues when clientId/config has changed between builds.
        googleSignInClient.signOut().addOnCompleteListener(activity, task -> {
            try {
                Intent signInIntent = googleSignInClient.getSignInIntent();
                activity.startActivityForResult(signInIntent, RC_SIGN_IN);
            } catch (Exception e) {
                Log.e(TAG, "Failed to launch sign-in intent", e);
                if (callback != null) {
                    callback.onError(e.getMessage() == null ? "Failed to launch Google Sign-In" : e.getMessage());
                }
            }
        });
    }

    public void signOut(SignInCallback callback) {
        if (googleSignInClient != null) {
            googleSignInClient.signOut().addOnCompleteListener(activity, task -> {
                if (callback == null) return;
                if (task.isSuccessful()) {
                    callback.onSuccess(null, null, null);
                } else {
                    callback.onError("Sign out failed");
                }
            });
            return;
        }

        if (callback != null) {
            callback.onSuccess(null, null, null);
        }
    }

    public void handleActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != RC_SIGN_IN) {
            return;
        }

        if (data == null) {
            if (callback != null) {
                callback.onError("Google sign-in returned empty data");
            }
            return;
        }

        Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
        handleSignInResult(task);
    }

    private void handleSignInResult(@NonNull Task<GoogleSignInAccount> completedTask) {
        try {
            GoogleSignInAccount account = completedTask.getResult(ApiException.class);
            if (callback != null && account != null) {
                callback.onSuccess(account.getIdToken(), account.getEmail(), account.getDisplayName());
            }
        } catch (ApiException e) {
            int code = e.getStatusCode();
            String status = CommonStatusCodes.getStatusCodeString(code);
            String message = "Sign in failed: " + code + " (" + status + ")";

            if (code == STATUS_DEVELOPER_ERROR) {
                message += ". Package=" + activity.getPackageName()
                        + ", webClientId=" + maskClientId(lastClientId)
                        + ". Check package/SHA1 and webClientId are from the same Google project. "
                        + "requestIdToken must use OAuth Web application client ID (not Android client ID).";
            }

            Log.e(
                    TAG,
                    "Google sign-in failed, code=" + code
                            + ", status=" + status
                            + ", package=" + activity.getPackageName()
                            + ", clientId=" + lastClientId,
                    e
            );

            if (callback != null) {
                callback.onError(message);
            }
        }
    }

    private String maskClientId(String clientId) {
        if (TextUtils.isEmpty(clientId)) {
            return "(empty)";
        }
        String value = clientId.trim();
        if (value.length() <= 24) {
            return value;
        }
        return value.substring(0, 16) + "..." + value.substring(value.length() - 8);
    }

    public String getUserInfoJson() {
        GoogleSignInAccount account = GoogleSignIn.getLastSignedInAccount(activity);
        if (account == null) {
            return null;
        }

        try {
            JSONObject json = new JSONObject();
            json.put("idToken", account.getIdToken());
            json.put("email", account.getEmail());
            json.put("displayName", account.getDisplayName());
            json.put("photoUrl", account.getPhotoUrl() != null ? account.getPhotoUrl().toString() : "");
            return json.toString();
        } catch (JSONException e) {
            Log.e(TAG, "Error creating user info JSON", e);
            return null;
        }
    }
}
