import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
  Dimensions
} from 'react-native';
import jsQR from 'jsqr';
import { orderApi, VerifyPickupResponse } from '../api/orderApi';
import { COLORS } from '../theme/theme';

// Lazy import camera only on native — avoids web crash
let CameraView: any = null;
let useCameraPermissions: any = null;
if (Platform.OS !== 'web') {
  try {
    const cam = require('expo-camera');
    CameraView = cam.CameraView;
    useCameraPermissions = cam.useCameraPermissions;
  } catch {
    // expo-camera not available
  }
}

type ScanState = 'IDLE' | 'VERIFYING' | 'VALID' | 'INVALID' | 'ALREADY_COLLECTED' | 'ERROR';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ChefQRScannerScreen = ({ navigation }: any) => {
  const [tokenInput, setTokenInput] = useState('');
  const [scanState, setScanState] = useState<ScanState>('IDLE');
  const [verifyResult, setVerifyResult] = useState<VerifyPickupResponse | null>(null);
  const [confirmingPickup, setConfirmingPickup] = useState(false);
  const [confirmingCash, setConfirmingCash] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanned, setScanned] = useState(false);

  // Web camera states & refs
  const [webCameraOpen, setWebCameraOpen] = useState(false);
  const [webCameraError, setWebCameraError] = useState<string | null>(null);
  const videoRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const streamRef = useRef<any>(null);

  // Camera permissions — only on native
  const [permission, requestPermission] = useCameraPermissions
    ? useCameraPermissions()
    : [null, async () => {}];

  // Stop web camera stream and animation loop
  const stopWebCamera = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track: any) => track.stop());
      } catch (e) {
        // ignore track stop error
      }
      streamRef.current = null;
    }
    setWebCameraOpen(false);
  };

  useEffect(() => {
    return () => {
      stopWebCamera();
    };
  }, []);

  // Frame scanning loop for web camera using jsQR
  const tickWebCamera = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === (video.HAVE_ENOUGH_DATA || 4)) {
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (width > 0 && height > 0) {
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data && code.data.trim()) {
            const token = code.data.trim().toUpperCase();
            stopWebCamera();
            setTokenInput(token);
            setScanState('IDLE');
            setTimeout(() => handleVerify(token), 300);
            return;
          }
        }
      }
    }

    animFrameIdRef.current = requestAnimationFrame(tickWebCamera);
  };

  const startWebCamera = async () => {
    setWebCameraError(null);
    setWebCameraOpen(true);

    try {
      let stream: any;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }
      animFrameIdRef.current = requestAnimationFrame(tickWebCamera);
    } catch (err: any) {
      console.error('Web camera access error:', err);
      setWebCameraError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission denied. Please allow access in browser settings.'
          : 'Could not access camera. Make sure a camera is attached.'
      );
    }
  };

  const handleVerify = async (token?: string) => {
    const finalToken = (token ?? tokenInput).trim().toUpperCase();
    if (!finalToken) {
      Alert.alert('Input Required', 'Please scan a QR code or enter the pickup token manually.');
      return;
    }

    try {
      setScanState('VERIFYING');
      setVerifyResult(null);
      setErrorMsg('');
      const result = await orderApi.verifyPickup(finalToken);
      setVerifyResult(result);

      if (result.valid) {
        setScanState('VALID');
      } else if (result.reason === 'ALREADY_COLLECTED') {
        setScanState('ALREADY_COLLECTED');
      } else {
        setScanState('INVALID');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to verify pickup token. Check your connection.');
      setScanState('ERROR');
    }
  };

  const handleOpenCamera = async () => {
    if (Platform.OS === 'web') {
      await startWebCamera();
      return;
    }
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Camera Permission Required', 'Please allow camera access to scan QR codes.');
        return;
      }
    }
    setScanned(false);
    setCameraOpen(true);
  };

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);
    setCameraOpen(false);
    const token = data.trim().toUpperCase();
    setTokenInput(token);
    setScanState('IDLE');
    // Auto-verify after scan
    setTimeout(() => handleVerify(token), 300);
  };

  const handleConfirmCash = async () => {
    if (!verifyResult?.order?._id) return;
    try {
      setConfirmingCash(true);
      await orderApi.confirmCashPayment(verifyResult.order._id);
      await handleVerify(tokenInput);
      Alert.alert('✅ Cash Payment Confirmed', 'Payment has been recorded successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to confirm cash payment');
    } finally {
      setConfirmingCash(false);
    }
  };

  const handleConfirmPickup = async () => {
    if (!verifyResult?.order?._id) return;
    try {
      setConfirmingPickup(true);
      await orderApi.confirmPickup(verifyResult.order._id);
      Alert.alert('✅ Pickup Confirmed!', 'Order has been marked as Completed. The student has collected their order.', [
        { text: 'OK', onPress: handleReset }
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to confirm pickup');
    } finally {
      setConfirmingPickup(false);
    }
  };

  const handleReset = () => {
    setTokenInput('');
    setScanState('IDLE');
    setVerifyResult(null);
    setErrorMsg('');
    setScanned(false);
  };

  const order = verifyResult?.order;
  const isPaid = order?.paymentStatus === 'PAID';
  const isCash = order?.paymentMethod === 'CASH_ON_PICKUP';

  return (
    <>
      {/* ── Native Camera Modal ── */}
      {Platform.OS !== 'web' && CameraView ? (
        <Modal visible={cameraOpen} animationType="slide" onRequestClose={() => setCameraOpen(false)}>
          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            />

            {/* Overlay frame */}
            <View style={styles.cameraOverlay}>
              <View style={styles.cameraTopOverlay} />
              <View style={styles.cameraMiddleRow}>
                <View style={styles.cameraSideOverlay} />
                <View style={styles.cameraScanFrame}>
                  {/* Corner markers */}
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                </View>
                <View style={styles.cameraSideOverlay} />
              </View>
              <View style={styles.cameraBottomOverlay}>
                <Text style={styles.cameraScanText}>
                  📷 Point the camera at the student's QR code
                </Text>
                <TouchableOpacity style={styles.cameraCancelBtn} onPress={() => setCameraOpen(false)}>
                  <Text style={styles.cameraCancelText}>✕ Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {/* ── Web Camera Modal ── */}
      {Platform.OS === 'web' ? (
        <Modal visible={webCameraOpen} animationType="slide" onRequestClose={stopWebCamera}>
          <View style={styles.cameraContainer}>
            <View style={styles.webVideoWrapper}>
              <video
                ref={videoRef}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                playsInline
                muted
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </View>

            {/* Overlay frame */}
            <View style={styles.cameraOverlay}>
              <View style={styles.cameraTopOverlay} />
              <View style={styles.cameraMiddleRow}>
                <View style={styles.cameraSideOverlay} />
                <View style={styles.cameraScanFrame}>
                  {/* Corner markers */}
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                </View>
                <View style={styles.cameraSideOverlay} />
              </View>
              <View style={styles.cameraBottomOverlay}>
                {webCameraError ? (
                  <Text style={[styles.cameraScanText, { color: '#FCA5A5' }]}>
                    ⚠️ {webCameraError}
                  </Text>
                ) : (
                  <Text style={styles.cameraScanText}>
                    📷 Point camera or webcam at student's QR code
                  </Text>
                )}
                <TouchableOpacity style={styles.cameraCancelBtn} onPress={stopWebCamera}>
                  <Text style={styles.cameraCancelText}>✕ Close Camera</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <Text style={styles.screenTitle}>📷 Pickup QR Verification</Text>
        <Text style={styles.screenSub}>
          Scan the student's QR code with the camera or enter the token manually.
        </Text>

        {/* ── Camera Scan Button ── */}
        <TouchableOpacity
          style={styles.scanCameraBtn}
          onPress={handleOpenCamera}
          activeOpacity={0.85}
        >
          <View style={styles.scanCameraBtnInner}>
            <Text style={styles.scanCameraIcon}>📷</Text>
            <View>
              <Text style={styles.scanCameraBtnText}>Scan QR Code with Camera</Text>
              <Text style={styles.scanCameraBtnSub}>
                {Platform.OS === 'web' ? 'Tap to open webcam scanner' : 'Tap to open camera'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* ── OR Divider ── */}
        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.orLine} />
        </View>

        {/* ── Manual Token Input ── */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Enter Pickup Token Manually</Text>
          <TextInput
            style={styles.tokenInput}
            value={tokenInput}
            onChangeText={(t) => { setTokenInput(t); setScanState('IDLE'); }}
            placeholder="e.g. CB-PICKUP-8F72A91C..."
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.verifyBtn, scanState === 'VERIFYING' && styles.verifyBtnDisabled]}
            onPress={() => handleVerify()}
            disabled={scanState === 'VERIFYING'}
          >
            {scanState === 'VERIFYING' ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.verifyBtnText}>🔍 Verify Token</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── VALID ORDER RESULT ── */}
        {scanState === 'VALID' && order ? (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultIcon}>✅</Text>
              <Text style={styles.resultTitle}>Order Verified!</Text>
            </View>

            {order.receiptNumber ? (
              <View style={styles.receiptNoBox}>
                <Text style={styles.receiptNoLabel}>Receipt No.</Text>
                <Text style={styles.receiptNo}>{order.receiptNumber}</Text>
              </View>
            ) : null}

            <ResultRow label="Student" value={order.student.name} bold />
            {order.student.studentId ? (
              <ResultRow label="Student ID" value={order.student.studentId} />
            ) : null}

            <View style={styles.divider} />

            <ResultRow label="Item" value={`${order.item.name} × ${order.item.quantity}`} bold />
            <ResultRow label="Total" value={`LKR ${order.item.total.toFixed(2)}`} accent />
            <ResultRow label="Pickup Slot" value={order.breakTimeSlot} highlight />
            <ResultRow label="Order Status" value={order.status} />

            <View style={styles.divider} />

            {/* Payment Status */}
            <View style={styles.payRow}>
              <Text style={styles.payLabel}>Payment</Text>
              <View style={[styles.payBadge, isPaid ? styles.payPaid : styles.payPending]}>
                <Text style={[styles.payBadgeText, isPaid ? styles.payPaidText : styles.payPendingText]}>
                  {isCash ? '💵 CASH' : '💳 ONLINE'} — {order.paymentStatus} {isPaid ? '✅' : '⏳'}
                </Text>
              </View>
            </View>

            {/* Cash confirmation notice */}
            {isCash && !isPaid ? (
              <View style={styles.cashNotice}>
                <Text style={styles.cashNoticeText}>
                  ⚠️ Cash on Pickup order. Collect LKR {order.item.total.toFixed(2)} before confirming.
                </Text>
                <TouchableOpacity style={styles.cashBtn} onPress={handleConfirmCash} disabled={confirmingCash}>
                  {confirmingCash
                    ? <ActivityIndicator size="small" color="#FFF" />
                    : <Text style={styles.cashBtnText}>💵 Confirm Cash Received</Text>
                  }
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.confirmBtn, !isPaid && styles.confirmBtnDisabled]}
                onPress={handleConfirmPickup}
                disabled={!isPaid || confirmingPickup}
              >
                {confirmingPickup
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Text style={styles.confirmBtnText}>
                      {isPaid ? '✅ Confirm Pickup & Complete' : '🔒 Collect Payment First'}
                    </Text>
                }
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleReset}>
                <Text style={styles.cancelBtnText}>↩ Scan Another</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* ── ALREADY COLLECTED ── */}
        {scanState === 'ALREADY_COLLECTED' && order ? (
          <View style={[styles.resultCard, styles.warningCard]}>
            <Text style={styles.resultIcon}>⚠️</Text>
            <Text style={styles.resultTitle}>Order Already Collected</Text>
            <Text style={styles.resultSubtitle}>This order has already been collected.</Text>
            {order.collectedAt ? (
              <Text style={styles.collectedAtText}>
                Collected At: {new Date(order.collectedAt).toLocaleString()}
              </Text>
            ) : null}
            {order.receiptNumber ? (
              <Text style={styles.receiptRef}>Receipt: {order.receiptNumber}</Text>
            ) : null}
            <TouchableOpacity style={[styles.cancelBtn, { marginTop: 12 }]} onPress={handleReset}>
              <Text style={styles.cancelBtnText}>📷 Scan Another</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── INVALID QR ── */}
        {scanState === 'INVALID' ? (
          <View style={[styles.resultCard, styles.errorCard]}>
            <Text style={styles.resultIcon}>❌</Text>
            <Text style={styles.resultTitle}>Invalid Pickup QR</Text>
            <Text style={styles.resultSubtitle}>
              This QR code is invalid or does not belong to a valid CampusBites order.
            </Text>
            <TouchableOpacity style={[styles.cancelBtn, { marginTop: 12 }]} onPress={handleReset}>
              <Text style={styles.cancelBtnText}>📷 Scan Again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── ERROR ── */}
        {scanState === 'ERROR' ? (
          <View style={[styles.resultCard, styles.errorCard]}>
            <Text style={styles.resultIcon}>⚠️</Text>
            <Text style={styles.resultTitle}>Verification Failed</Text>
            <Text style={styles.resultSubtitle}>
              {errorMsg || 'Could not connect to server. Check your internet and try again.'}
            </Text>
            <TouchableOpacity style={[styles.cancelBtn, { marginTop: 12 }]} onPress={handleReset}>
              <Text style={styles.cancelBtnText}>↩ Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Instructions */}
        {scanState === 'IDLE' ? (
          <View style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>📋 How to verify a pickup</Text>
            <InstructionStep num="1" text="Tap 'Scan QR Code with Camera' to open the scanner." />
            <InstructionStep num="2" text="Point the camera at the student's QR code from the CampusBites app." />
            <InstructionStep num="3" text="The token auto-verifies after a successful scan." />
            <InstructionStep num="4" text="For cash orders, collect payment and confirm before completing pickup." />
            <InstructionStep num="5" text="Tap 'Confirm Pickup' to mark the order as Completed." />
          </View>
        ) : null}

      </ScrollView>
    </>
  );
};

// ── Sub-components ─────────────────────────────────────

const ResultRow = ({ label, value, bold = false, highlight = false, accent = false }:
  { label: string; value: string; bold?: boolean; highlight?: boolean; accent?: boolean }) => (
  <View style={styles.resultRow}>
    <Text style={styles.resultLabel}>{label}</Text>
    <Text style={[
      styles.resultValue,
      bold && styles.resultValueBold,
      highlight && styles.resultValueHighlight,
      accent && styles.resultValueAccent
    ]}>
      {value}
    </Text>
  </View>
);

const InstructionStep = ({ num, text }: { num: string; text: string }) => (
  <View style={styles.stepRow}>
    <View style={styles.stepNumCircle}>
      <Text style={styles.stepNum}>{num}</Text>
    </View>
    <Text style={styles.instructionText}>{text}</Text>
  </View>
);

// ── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },

  screenTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  screenSub: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 18, lineHeight: 18 },

  // Camera scan button
  scanCameraBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6
  },
  scanCameraBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  scanCameraIcon: { fontSize: 36 },
  scanCameraBtnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  scanCameraBtnSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  // OR divider
  orRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  orLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  orText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },

  // Input
  inputCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: COLORS.border,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3
  },
  inputLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  tokenInput: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10,
    padding: 12, fontSize: 14, color: COLORS.text,
    backgroundColor: COLORS.background,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 12, letterSpacing: 0.5
  },
  verifyBtn: {
    backgroundColor: COLORS.primary, paddingVertical: 13,
    borderRadius: 10, alignItems: 'center'
  },
  verifyBtnDisabled: { opacity: 0.7 },
  verifyBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },

  // Camera modal
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  webVideoWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000'
  },
  camera: { flex: 1 },
  cameraOverlay: { ...StyleSheet.absoluteFillObject },
  cameraTopOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  cameraMiddleRow: { flexDirection: 'row', height: 250 },
  cameraSideOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  cameraScanFrame: {
    width: 250, height: 250,
    borderRadius: 4
  },
  cameraBottomOverlay: {
    flex: 1.2, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 20, gap: 16
  },
  cameraScanText: { color: '#FFFFFF', fontSize: 14, textAlign: 'center', fontWeight: '600' },
  cameraCancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)'
  },
  cameraCancelText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  // Corner markers for scan frame
  corner: {
    position: 'absolute', width: 24, height: 24,
    borderColor: COLORS.accent, borderWidth: 3
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },

  // Result card
  resultCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 20,
    marginBottom: 16, borderWidth: 1, borderColor: COLORS.border,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3
  },
  warningCard: { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' },
  errorCard: { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  resultIcon: { fontSize: 32 },
  resultTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  resultSubtitle: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4, lineHeight: 18 },
  receiptNoBox: {
    backgroundColor: COLORS.background, borderRadius: 8, padding: 10,
    alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: COLORS.border
  },
  receiptNoLabel: { fontSize: 10, color: COLORS.textSecondary },
  receiptNo: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' },
  resultLabel: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  resultValue: { fontSize: 13, color: COLORS.text, flex: 1.5, textAlign: 'right' },
  resultValueBold: { fontWeight: '700' },
  resultValueHighlight: { color: COLORS.primary, fontWeight: '700' },
  resultValueAccent: { color: COLORS.accent, fontWeight: '800', fontSize: 15 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  payLabel: { fontSize: 13, color: COLORS.textSecondary },
  payBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  payPaid: { backgroundColor: '#DCFCE7' },
  payPending: { backgroundColor: '#FFF7ED' },
  payBadgeText: { fontSize: 12, fontWeight: '800' },
  payPaidText: { color: COLORS.success },
  payPendingText: { color: COLORS.warning },
  cashNotice: {
    backgroundColor: '#FFF7ED', borderRadius: 10, padding: 12,
    marginTop: 12, borderWidth: 1, borderColor: '#FED7AA'
  },
  cashNoticeText: { fontSize: 13, color: '#92400E', lineHeight: 18, marginBottom: 10 },
  cashBtn: {
    backgroundColor: COLORS.accent, paddingVertical: 10,
    borderRadius: 8, alignItems: 'center'
  },
  cashBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  actionButtons: { marginTop: 16, gap: 10 },
  confirmBtn: {
    backgroundColor: COLORS.primary, paddingVertical: 13,
    borderRadius: 10, alignItems: 'center'
  },
  confirmBtnDisabled: { backgroundColor: '#94A3B8' },
  confirmBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  cancelBtn: {
    borderWidth: 1.5, borderColor: COLORS.border, paddingVertical: 11,
    borderRadius: 10, alignItems: 'center'
  },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 14 },
  collectedAtText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center' },
  receiptRef: { fontSize: 12, color: COLORS.primary, fontWeight: '700', marginTop: 4, textAlign: 'center' },

  // Instructions
  instructionCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: COLORS.border
  },
  instructionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 14 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  stepNumCircle: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center'
  },
  stepNum: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  instructionText: { fontSize: 13, color: COLORS.textSecondary, flex: 1, lineHeight: 18 }
});
