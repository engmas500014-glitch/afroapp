<?php
// ---------------------------------------------------------------------------
// AFRO HR — PHP payslip email endpoint (drop-in replacement for server.ts).
// Routes:  GET  /api/health
//          POST /api/send-payslip
//          POST /api/send-all-payslips
// Dependency-free SMTP client (works on shared PHP hosting, no Composer).
// ---------------------------------------------------------------------------

error_reporting(E_ALL & ~E_DEPRECATED & ~E_NOTICE);
ini_set('display_errors', '0');

// ---- CORS (the frontend is hosted on a different origin) -------------------
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Api-Key, ngrok-skip-browser-warning');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$config = require __DIR__ . '/config.php';

function respond($code, $data) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function smtp_configured($config) {
    return !empty($config['smtp_host'])
        && !empty($config['smtp_user'])
        && !empty($config['smtp_pass'])
        && $config['smtp_pass'] !== 'PUT_APP_PASSWORD_HERE';
}

// ---- Routing ---------------------------------------------------------------
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$route = '';
if (preg_match('#/(health|send-payslip|send-all-payslips)/?$#', $path, $m)) {
    $route = $m[1];
}

// Health check (no auth needed)
if ($route === 'health' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    respond(200, ['ok' => true, 'smtpConfigured' => smtp_configured($config)]);
}

// Optional shared-secret protection for send routes
if (!empty($config['api_key'])) {
    $provided = isset($_SERVER['HTTP_X_API_KEY']) ? $_SERVER['HTTP_X_API_KEY'] : '';
    if (!hash_equals($config['api_key'], $provided)) {
        respond(401, ['error' => 'Unauthorized: invalid API key']);
    }
}

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) $body = [];

// ---------------------------------------------------------------------------
function money($n) {
    return number_format((float)$n, ((float)$n == (int)$n) ? 0 : 2);
}

function build_payslip_html($name, $month, $year, $details, $netSalary) {
    $d    = is_array($details) ? $details : [];
    $base = isset($d['base']) ? $d['base'] : $netSalary;
    $ot   = isset($d['ot'])   ? $d['ot']   : 0;
    $bonus= isset($d['bonus'])? $d['bonus']: 0;
    $gift = isset($d['gift']) ? $d['gift'] : 0;
    $retro= isset($d['retro'])? $d['retro']: 0;
    $mob  = isset($d['mobile'])? $d['mobile']: 0;
    $ocn  = isset($d['otherCostNet']) ? $d['otherCostNet'] : 0;

    $rows = '<tr style="background-color:#f7fafc;"><td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#4a5568;">Base Salary</td>'
          . '<td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:right;color:#4a5568;">EGP ' . money($base) . '</td></tr>';
    if ($ot)    $rows .= '<tr><td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#4a5568;">Overtime (Net)</td><td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:right;color:#38a169;">+ EGP ' . money($ot) . '</td></tr>';
    if ($bonus) $rows .= '<tr><td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#4a5568;">Top Hero Bonus</td><td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:right;color:#3182ce;">+ EGP ' . money($bonus) . '</td></tr>';
    if ($gift)  $rows .= '<tr><td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#4a5568;">Gift</td><td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:right;color:#805ad5;">+ EGP ' . money($gift) . '</td></tr>';
    if ($retro) $rows .= '<tr><td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#4a5568;">Retroactive Pay</td><td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:right;color:#718096;">+ EGP ' . money($retro) . '</td></tr>';
    if ($mob)   $rows .= '<tr><td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#4a5568;">Mobile Allowance</td><td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:right;color:#718096;">+ EGP ' . money($mob) . '</td></tr>';
    if ($ocn)   $rows .= '<tr><td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#4a5568;">Other Cost (Net)</td><td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:right;color:#718096;">+ EGP ' . money($ocn) . '</td></tr>';

    $safeName = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
    return '<div style="font-family:\'Segoe UI\',Arial,sans-serif;padding:30px;color:#333;max-width:600px;line-height:1.6;border:1px solid #eaeaea;border-radius:8px;">'
        . '<h2 style="color:#1a365d;margin-bottom:20px;border-bottom:2px solid #ebf8ff;padding-bottom:10px;">Monthly Payslip</h2>'
        . '<p>Dear <strong>' . $safeName . '</strong>,</p>'
        . '<p>Please find the detailed breakdown of your salary for <strong style="color:#2b6cb0;">' . htmlspecialchars($month) . ' ' . htmlspecialchars($year) . '</strong> below:</p>'
        . '<table style="width:100%;border-collapse:collapse;margin-top:20px;font-size:14px;">' . $rows
        . '<tr style="background-color:#ebf8ff;"><td style="padding:12px;border-bottom:2px solid #2b6cb0;font-weight:bold;font-size:16px;color:#2c5282;">Total Net Salary</td>'
        . '<td style="padding:12px;border-bottom:2px solid #2b6cb0;text-align:right;font-weight:bold;font-size:16px;color:#2c5282;">EGP ' . money($netSalary) . '</td></tr></table>'
        . '<p style="margin-top:30px;font-size:13px;color:#718096;">If you have any questions regarding this payslip, please reach out to the HR department.</p>'
        . '<p style="font-size:14px;font-weight:bold;color:#4a5568;">Best regards,<br/><span style="color:#2b6cb0;">AFRO HR Team</span></p></div>';
}

// ---- Minimal SMTP client (STARTTLS on 587, or implicit SSL on 465) ---------
class SmtpException extends Exception {}

function smtp_read($fp, $expected) {
    $data = '';
    while (($line = fgets($fp, 515)) !== false) {
        $data .= $line;
        // Multiline responses have a '-' after the code; last line has a space.
        if (isset($line[3]) && $line[3] === ' ') break;
    }
    $code = (int)substr($data, 0, 3);
    if ($expected !== null && $code !== $expected) {
        throw new SmtpException("SMTP expected $expected but got: " . trim($data));
    }
    return $data;
}

function smtp_cmd($fp, $cmd, $expected) {
    fwrite($fp, $cmd . "\r\n");
    return smtp_read($fp, $expected);
}

function smtp_send_mail($config, $to, $subject, $html, $cc = '') {
    $host   = $config['smtp_host'];
    $port   = (int)$config['smtp_port'];
    $secure = strtolower($config['smtp_secure']);
    $user   = $config['smtp_user'];
    $pass   = $config['smtp_pass'];
    $from   = $config['smtp_from'];
    $fname  = isset($config['from_name']) ? $config['from_name'] : 'HR';

    $remote = ($secure === 'ssl' ? 'ssl://' : '') . $host . ':' . $port;
    $ctx = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true]]);
    $fp = @stream_socket_client($remote, $errno, $errstr, 30, STREAM_CLIENT_CONNECT, $ctx);
    if (!$fp) throw new SmtpException("Connection failed: $errstr ($errno)");
    stream_set_timeout($fp, 30);

    smtp_read($fp, 220);
    $ehloHost = isset($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : 'localhost';
    smtp_cmd($fp, "EHLO $ehloHost", 250);

    if ($secure === 'tls') {
        smtp_cmd($fp, "STARTTLS", 220);
        if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT
                | STREAM_CRYPTO_METHOD_TLSv1_1_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT)) {
            throw new SmtpException("Failed to start TLS encryption");
        }
        smtp_cmd($fp, "EHLO $ehloHost", 250);
    }

    smtp_cmd($fp, "AUTH LOGIN", 334);
    smtp_cmd($fp, base64_encode($user), 334);
    smtp_cmd($fp, base64_encode($pass), 235);   // 535 here = bad username/App Password

    smtp_cmd($fp, "MAIL FROM:<$from>", 250);
    smtp_cmd($fp, "RCPT TO:<$to>", 250);
    if ($cc) smtp_cmd($fp, "RCPT TO:<$cc>", 250);   // deliver a copy to the CC address
    smtp_cmd($fp, "DATA", 354);

    $headers  = "From: =?UTF-8?B?" . base64_encode($fname) . "?= <$from>\r\n";
    $headers .= "To: <$to>\r\n";
    if ($cc) $headers .= "Cc: <$cc>\r\n";
    $headers .= "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "Content-Transfer-Encoding: base64\r\n";
    // Dot-stuffing is avoided by base64-encoding the body.
    $data = $headers . "\r\n" . chunk_split(base64_encode($html));
    smtp_cmd($fp, $data . "\r\n.", 250);

    smtp_cmd($fp, "QUIT", null);
    fclose($fp);
    return true;
}

// ---- Handlers --------------------------------------------------------------
if ($route === 'send-payslip' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $email    = isset($body['email']) ? $body['email'] : '';
    $name     = isset($body['employeeName']) ? $body['employeeName'] : '';
    $netSalary= isset($body['netSalary']) ? $body['netSalary'] : null;
    $month    = isset($body['month']) ? $body['month'] : '';
    $year     = isset($body['year']) ? $body['year'] : '';
    $details  = isset($body['details']) ? $body['details'] : [];

    if (!$email || !$name || $netSalary === null || !$month || !$year) {
        respond(400, ['error' => 'Missing required fields']);
    }
    if (!smtp_configured($config)) {
        respond(200, ['message' => 'Payslip simulated (configure SMTP to send real emails)', 'simulated' => true]);
    }
    try {
        $html = build_payslip_html($name, $month, $year, $details, $netSalary);
        $cc = isset($body['cc']) ? trim($body['cc']) : '';
        smtp_send_mail($config, $email, "Payslip for $month $year", $html, $cc);
        respond(200, ['message' => 'Payslip sent successfully']);
    } catch (SmtpException $e) {
        $msg = $e->getMessage();
        if (strpos($msg, '535') !== false) {
            $msg = 'Google rejected the login. Use a Gmail App Password (not the normal password) for ' . $config['smtp_user'] . '.';
        }
        respond(500, ['error' => $msg]);
    }
}

if ($route === 'send-all-payslips' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $employees = isset($body['employees']) ? $body['employees'] : null;
    $month = isset($body['month']) ? $body['month'] : '';
    $year  = isset($body['year']) ? $body['year'] : '';

    if (!is_array($employees)) {
        respond(400, ['error' => 'Missing employees list']);
    }
    if (!smtp_configured($config)) {
        respond(200, [
            'message'      => 'Simulated sending to ' . count($employees) . ' employees (configure SMTP for real emails)',
            'successCount' => count($employees),
            'failCount'    => 0,
            'simulated'    => true,
        ]);
    }

    $success = 0; $fail = 0; $authError = '';
    foreach ($employees as $emp) {
        $to = isset($emp['email']) ? $emp['email'] : '';
        if (!$to) { $fail++; continue; }
        try {
            $html = build_payslip_html(
                isset($emp['name']) ? $emp['name'] : '',
                $month, $year,
                isset($emp['details']) ? $emp['details'] : [],
                isset($emp['netSalary']) ? $emp['netSalary'] : 0
            );
            $cc = isset($emp['cc']) ? trim($emp['cc']) : '';
            smtp_send_mail($config, $to, "Payslip for $month $year", $html, $cc);
            $success++;
        } catch (SmtpException $e) {
            $fail++;
            if (strpos($e->getMessage(), '535') !== false) {
                $authError = 'Google rejected the login. Use a Gmail App Password for ' . $config['smtp_user'] . '.';
                break;   // stop hammering on auth failure
            }
        }
    }
    if ($authError) {
        respond(500, ['error' => $authError]);
    }
    respond(200, ['message' => 'Batch sending completed', 'successCount' => $success, 'failCount' => $fail]);
}

respond(404, ['error' => 'Not found']);
