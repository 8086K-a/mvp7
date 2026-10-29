package co.median.android;

import android.app.Activity;
import android.os.Build;
import android.text.TextUtils;
import android.webkit.WebResourceResponse;

import java.io.BufferedInputStream;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;

import co.median.median_core.AppConfig;
import co.median.median_core.GNLog;
import co.median.median_core.GoNativeWebviewInterface;

/**
 * Created by weiyin on 1/29/16.
 */

public class HtmlIntercept {
    private static final String TAG = HtmlIntercept.class.getName();
    private String interceptUrl;
    private String JSBridgeScript;

    // track whether we have intercepted a page at all. We will always try to intercept the first time,
    // because interceptUrl may not have been set if restoring from a bundle.
    private boolean hasIntercepted = false;

    public void setInterceptUrl(String interceptUrl) {
        this.interceptUrl = interceptUrl;
    }

    public WebResourceResponse interceptHtml(Activity activity, GoNativeWebviewInterface view, String url, String referer) {

        AppConfig appConfig = AppConfig.getInstance(activity);
        if (!appConfig.interceptHtml && (appConfig.customHeaders == null || appConfig.customHeaders.isEmpty())) return null;

        if (!hasIntercepted) {
            interceptUrl = url;
            hasIntercepted = true;
        }
        if (!urlMatches(interceptUrl, url)) return null;

        InputStream is = null;
        ByteArrayOutputStream baos = null;

        try {
            URL parsedUrl = new URL(url);
            String protocol = parsedUrl.getProtocol();
            if (!protocol.equalsIgnoreCase("http") && !protocol.equalsIgnoreCase("https")) return null;

            HttpURLConnection connection = (HttpURLConnection)parsedUrl.openConnection();

            // Disable automatic redirects to handle them manually.
            connection.setInstanceFollowRedirects(false);

            String customUserAgent = appConfig.userAgentForUrl(parsedUrl.toString());
            if (customUserAgent != null) {
                connection.setRequestProperty("User-Agent", customUserAgent);
            } else {
                if (!TextUtils.isEmpty(appConfig.userAgent)) {
                    connection.setRequestProperty("User-Agent", appConfig.userAgent);
                } else {
                    // create a userAgent with the device userAgent plus additional string
                    connection.setRequestProperty("User-Agent", view.getDefaultUserAgent() + " " + appConfig.userAgentAdd);
                }
            }
            connection.setRequestProperty("Cache-Control", "no-cache");

            if (referer != null) {
                connection.setRequestProperty("Referer", referer);
            }

            connection.setRequestProperty("Accept-Language", Locale.getDefault().toLanguageTag());

            Map<String, String> customHeaders = CustomHeaders.getCustomHeaders(activity);
            if (customHeaders != null) {
                for (Map.Entry<String, String> entry : customHeaders.entrySet()) {
                    connection.setRequestProperty(entry.getKey(), entry.getValue());
                }
            }

            connection.connect();
            int responseCode = connection.getResponseCode();

            if (responseCode == HttpURLConnection.HTTP_MOVED_PERM ||
                    responseCode == HttpURLConnection.HTTP_MOVED_TEMP ||
                    responseCode == HttpURLConnection.HTTP_SEE_OTHER ||
                    responseCode == 307) {
                // This block executes only if automatic redirects are disabled (setInstanceFollowRedirects(false)).
                // Retrieve the redirect URL from the 'Location' header for manual handling.
                String location = connection.getHeaderField("Location");

                // close the current connection
                connection.disconnect();

                // validate location as URL
                try {
                    new URL(location);
                } catch (MalformedURLException ex) {
                    URL base = new URL(url);
                    location = new URL(base, location).toString();
                }

                if (!TextUtils.isEmpty(location)) {
                    // Follow the redirect by calling interceptHtml with the new location.
                    return interceptHtml(activity, view, location, url);
                } else {
                    // If 'location' is empty or invalid, return null to let WebView handle it.
                    return null;
                }
            }

            String mimetype = connection.getContentType();
            if (mimetype == null) {
                try {
                    is = new BufferedInputStream(connection.getInputStream());
                } catch (IOException e) {
                    is = new BufferedInputStream(connection.getErrorStream());
                }
                mimetype = HttpURLConnection.guessContentTypeFromStream(is);
            }

            // if not html, then return null so that webview loads directly.
            if (mimetype == null || !mimetype.startsWith("text/html"))
                return null;

            // get and intercept the data
            String characterEncoding = getCharset(mimetype);
            if (characterEncoding == null) {
                characterEncoding = "UTF-8";
            } else if (characterEncoding.toLowerCase().equals("iso-8859-1")) {
                // windows-1252 is a superset of ios-8859-1 that supports the euro symbol €.
                // The html5 spec actually maps "iso-8859-1" to windows-1252 encoding
                characterEncoding = "windows-1252";
            }

            if (is == null) {
                try {
                    is = new BufferedInputStream(connection.getInputStream());
                } catch (IOException e) {
                    is = new BufferedInputStream(connection.getErrorStream());
                }
            }

            int initialLength = connection.getContentLength();
            if (initialLength < 0)
                initialLength = UrlNavigation.DEFAULT_HTML_SIZE;

            baos = new ByteArrayOutputStream(initialLength);
            IOUtils.copy(is, baos);

            Charset charset = Charset.forName(characterEncoding);

            String html;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                html = baos.toString(charset);
            } else {
                html = new String(baos.toByteArray(), charset);
            }

            return new WebResourceResponse(
                    "text/html",
                    StandardCharsets.UTF_8.name(),
                    new ByteArrayInputStream(html.getBytes(StandardCharsets.UTF_8))
            );
        } catch (Exception e) {
            GNLog.getInstance().logError(TAG, e.toString(), e);
            return null;
        } finally {
            IOUtils.close(is);
            IOUtils.close(baos);
        }
    }

    // Do these urls match, ignoring trailing slash in path
    private static boolean urlMatches(String url1, String url2) {
        if (url1 == null || url2 == null) return false;

        try {
            URL parsed1 = new URL(url1);
            URL parsed2 = new URL(url2);

            if (stringsNotEqual(parsed1.getProtocol(), parsed2.getProtocol())) return false;

            if (stringsNotEqual(parsed1.getAuthority(), parsed2.getAuthority())) return false;

            if (stringsNotEqual(parsed1.getQuery(), parsed2.getQuery())) return false;

            String path1 = parsed1.getPath();
            String path2 = parsed2.getPath();
            if (path1 == null) path1 = "";
            if (path2 == null) path2 = "";

            int lengthDiff = path2.length() - path2.length();
            if (lengthDiff > 1 || lengthDiff < -1) return false;
            if (lengthDiff == 0) return path1.equals(path2);
            if (lengthDiff == 1) {
                return path2.equals(path1 + "/");
            }

            // lengthDiff == -1
            return path1.equals(path2 + "/");
        } catch (MalformedURLException e) {
            return false;
        }
    }

    private static boolean stringsNotEqual(String s1, String s2) {
        return !(s1 == null ? s2 == null : s1.equals(s2));
    }

    private static String getCharset(String contentType) {
        if (contentType == null || contentType.isEmpty()) {
            return null;
        }

        String[] tokens = contentType.split("; *");
        for (String s : tokens) {
            if (s.startsWith("charset=")) {
                return s.substring("charset=".length());
            }
        }

        return null;
    }
}
