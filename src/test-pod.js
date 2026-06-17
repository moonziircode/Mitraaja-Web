const fs = require('fs');
const path = require('path');

const USERNAME = '50004786';
const PASSWORD = 'aa12345';

async function main() {
  try {
    const step1 = await fetch('https://cas.anteraja.id/cas/login?isapp=true&acctype=emp');
    const setCookie1 = step1.headers.getSetCookie ? step1.headers.getSetCookie() : [];
    const jsessionidCookie = setCookie1.find(c => c.startsWith('JSESSIONID='));
    const jsessionid = jsessionidCookie ? jsessionidCookie.split(';')[0] : '';
    const lt = step1.headers.get('lt');
    const execution = step1.headers.get('execution');
    
    const postData = new URLSearchParams({
      username: USERNAME,
      password: PASSWORD,
      _eventId: 'submit',
      submit: 'login',
      lt: lt,
      execution: execution
    });
    
    const step2 = await fetch('https://cas.anteraja.id/cas/login?isapp=true&acctype=emp', {
      method: 'POST',
      headers: {
        'Cookie': jsessionid,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: postData.toString()
    });
    
    const setCookie2 = step2.headers.getSetCookie ? step2.headers.getSetCookie() : [];
    const tgcCookie = setCookie2.find(c => c.startsWith('TGC='));
    const tgc = tgcCookie ? tgcCookie.split(';')[0] : '';
    
    const step3 = await fetch('https://cas.anteraja.id/cas/login?service=https%3A%2F%2Fapi.anteraja.id%2F', {
      headers: { 'Cookie': tgc }
    });
    
    const redirectUrl = step3.headers.get('redirecturl') || step3.headers.get('location');
    const parsedUrl = new URL(redirectUrl);
    const ticket = parsedUrl.searchParams.get('ticket');
    
    const step4 = await fetch('https://api.anteraja.id/user/cas/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'token': '',
        'appid': 'JV_APP',
        'msgid': '1555315559769',
        'imei': 'dev_device_uuid_12345',
        'deviceUuid': 'dev_device_uuid_12345',
        'hardwareSerialNo': 'dev_serial',
        'manufacture': 'Apple',
        'model': 'Macbook',
        'os': 'macOS',
        'osVersion': '14.0',
        'appVersion': '2.2.4',
        'mv': '1.1',
        'source': 'MAA'
      },
      body: JSON.stringify({
        ticket: ticket,
        deviceId: 'dev_device_uuid_12345',
        appKey: 'MAA',
        appSecret: 'santuy',
        service: 'https://api.anteraja.id/'
      })
    });
    
    const resBody = await step4.json();
    const token = resBody.content.token;
    
    const testAwb = '11003838770507';
    
    const metadataHeaders = {
      'token': token,
      'appid': 'JV_APP',
      'msgid': Date.now().toString(),
      'imei': 'dev_device_uuid_12345',
      'deviceUuid': 'dev_device_uuid_12345',
      'hardwareSerialNo': 'dev_serial',
      'manufacture': 'Apple',
      'model': 'Macbook',
      'os': 'macOS',
      'osVersion': '14.0',
      'appVersion': '2.2.4',
      'mv': '1.1',
      'source': 'MAA'
    };
    
    const urlC = `https://api.anteraja.id/maa-task/order/report/proofOfDelivery/${testAwb}`;
    const resC = await fetch(urlC, { method: 'GET', headers: metadataHeaders });
    
    if (resC.status === 200) {
      const buffer = await resC.arrayBuffer();
      fs.writeFileSync(path.join(__dirname, 'pod.pdf'), Buffer.from(buffer));
      console.log('PDF saved successfully to src/pod.pdf');
    } else {
      console.log('Failed to fetch PDF, status:', resC.status);
    }

  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
