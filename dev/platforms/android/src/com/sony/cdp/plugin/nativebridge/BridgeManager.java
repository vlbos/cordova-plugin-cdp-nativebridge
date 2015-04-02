package com.sony.cdp.plugin.nativebridge;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.util.Log;

/**
 * @class BridgeManager
 * @brief cdp.plugin.nativebridge のエントリクラス
 */
public class BridgeManager extends CordovaPlugin {

	private static final String TAG = "[BridgeManager]";

    // Result Code
    private static final int SUCCESS_OK 				= 0x0000;
    private static final int ERROR_FAIL 				= 0x0001;
    private static final int ERROR_CANCEL 			= 0x0002;
    private static final int ERROR_INVALID_ARG 		= 0x0003;
    private static final int ERROR_NOT_IMPLEMENT 	= 0x0004;
    private static final int ERROR_NOT_SUPPORT 		= 0x0005;
    private static final int ERROR_INVALID_OPERATION = 0x0006;
	private static final int ERROR_CLASS_NOT_FOUND 	= 0x0007;

	///////////////////////////////////////////////////////////////////////
	// Override: CordovaPlugin

	//! execute のエントリ
    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        if (action.equals("execTask")) {
        	execTask(args.getJSONObject(0), args.getJSONObject(1), callbackContext);
        	return true;
        }
        return false;
    }

	///////////////////////////////////////////////////////////////////////
	// private methods

	//! "execTask" のエントリ
    private void execTask(JSONObject execInfo, JSONObject argsInfo, CallbackContext callbackContext) {
    	Log.v(TAG, "execTask");
    }
}
