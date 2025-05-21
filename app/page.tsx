import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Facebook Pixel Server-Side Gateway</h1>
          <p className="text-xl max-w-2xl mx-auto">
            Send events to Facebook Conversions API securely, bypass ad blockers, and protect user data
          </p>
          <div className="mt-8">
            <Link href="/admin/dashboard" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mr-4">
              Admin Dashboard
            </Link>
            <Link href="/test-pixel" className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded">
              Test Pixel Tool
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <CardTitle>Server-Side Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Bypass ad blockers and browser restrictions by sending events directly from your server to Facebook's
                Conversions API.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Privacy</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Automatically hash personally identifiable information (PII) using SHA-256 before sending it to Meta's
                Conversions API.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Multi-Pixel Support</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Manage multiple Facebook Pixels for different clients or websites through a single gateway with secure
                credential storage.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Integration Guide</h2>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Client-Side Implementation</h2>
            <p className="mb-4">
              Add this code to your website <strong>after</strong> your existing Facebook Pixel code to automatically
              forward all events to the server-side gateway:
            </p>
            <div className="bg-gray-100 p-4 rounded-lg overflow-auto">
              <pre className="text-sm md:text-base">
                {`<script>
// Facebook Pixel Server-Side Gateway
!function(w,d){
  // Store the original fbq function
  var originalFbq = w.fbq;
  
  // Only proceed if fbq exists (Facebook Pixel is installed)
  if (typeof originalFbq !== 'function') return;
  
  // Your gateway URL - replace with your actual deployment URL
  var gatewayUrl = '${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : window.location.origin}/api/track';
  
  // Get the pixel ID from the existing Facebook Pixel
  var getPixelId = function() {
    if (w.fbq && w.fbq.instance && w.fbq.instance.pixelsByID) {
      return Object.keys(w.fbq.instance.pixelsByID)[0] || '';
    }
    return '';
  };
  
  // Get basic user data including fbp and fbc cookies
  var getUserData = function() {
    return {
      client_user_agent: navigator.userAgent,
      fbp: (function(){
        var c = d.cookie.match(/_fbp=([^;]+)/);
        return c ? c[1] : null;
      })(),
      fbc: (function(){
        var c = d.cookie.match(/_fbc=([^;]+)/);
        return c ? c[1] : null;
      })()
    };
  };
  
  // Override the fbq function to intercept events
  w.fbq = function() {
    // Call the original fbq function
    originalFbq.apply(this, arguments);
    
    // Process the arguments
    var args = Array.prototype.slice.call(arguments);
    
    // Only process track events
    if (args[0] === 'track') {
      var eventName = args[1];
      var params = args[2] || {};
      var pixelId = getPixelId();
      
      // Skip if no pixel ID found
      if (!pixelId) return;
      
      // Prepare data for the server-side gateway
      var data = {
        pixelId: pixelId,
        event_name: eventName,
        event_time: Math.floor(Date.now()/1000),
        user_data: getUserData(),
        custom_data: params
      };
      
      // Extract user data from params if available
      if (params.em) {
        data.user_data.em = params.em;
        delete params.em;
      }
      
      if (params.ph) {
        data.user_data.ph = params.ph;
        delete params.ph;
      }
      
      // Send to gateway
      fetch(gatewayUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data),
        mode: 'cors',
        credentials: 'omit'
      }).catch(function(e) {
        console.error('Facebook Pixel Gateway: Failed to send event', e);
      });
    }
  };
  
  // Copy all properties from the original fbq
  for (var prop in originalFbq) {
    if (originalFbq.hasOwnProperty(prop)) {
      w.fbq[prop] = originalFbq[prop];
    }
  }
  
  console.log('Facebook Pixel Server-Side Gateway initialized');
}(window, document);
</script>`}
              </pre>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">How It Works</h2>
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-2">1. Automatic Event Interception</h3>
                <p>
                  The script intercepts all events sent to the standard Facebook Pixel and automatically forwards them
                  to your server-side gateway. No additional event tracking code is needed.
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-2">2. Server-Side Processing</h3>
                <p>
                  Your gateway receives the events, hashes any personally identifiable information (PII) using SHA-256,
                  and forwards them to Facebook's Conversions API.
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-2">3. Improved Tracking Accuracy</h3>
                <p>
                  By sending events server-side, you bypass ad blockers and browser restrictions, improving the accuracy
                  of your conversion tracking and ad optimization.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Implementation Steps</h2>
            <ol className="list-decimal pl-5 space-y-4">
              <li className="pl-2">
                <span className="font-semibold">Add your Facebook Pixel to the gateway:</span>
                <p className="mt-1">First, add your Facebook Pixel ID and Access Token through the admin dashboard.</p>
                <Link href="/admin/dashboard" className="inline-block mt-2">
                  <Button variant="outline" size="sm">
                    Go to Admin Dashboard
                  </Button>
                </Link>
              </li>

              <li className="pl-2">
                <span className="font-semibold">Ensure standard Facebook Pixel is installed:</span>
                <p className="mt-1">Make sure the standard Facebook Pixel is already installed on the website.</p>
              </li>

              <li className="pl-2">
                <span className="font-semibold">Add the gateway script:</span>
                <p className="mt-1">Add the script above immediately after the Facebook Pixel code.</p>
              </li>

              <li className="pl-2">
                <span className="font-semibold">That's it!</span>
                <p className="mt-1">
                  No additional event tracking code needed. All events sent to the Facebook Pixel will automatically be
                  forwarded to your server-side gateway.
                </p>
              </li>
            </ol>
          </section>
        </div>
      </main>

      <footer className="bg-gray-100 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>© {new Date().getFullYear()} Facebook Pixel Server-Side Gateway</p>
        </div>
      </footer>
    </div>
  )
}
