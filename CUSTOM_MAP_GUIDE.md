# Custom map-route controls

This version adds interactive custom waypoints while retaining the photo-based London on Foot interface.

## Try this exact sequence

1. Start the website; select **Your walk → Clear** to remove the sample stops.
2. Click an unmarked location near Oval on the map, then **Start here**.
3. Click the marker for a curated attraction and choose **Add as next stop**.
4. Click any other unmarked location and choose **Add as next stop**.
5. Continue alternating custom pins and handpicked attractions.
6. Select **Your walk → Follow my order → Draw my walking route** to preserve that exact sequence.
7. Try **Optimise stops → Optimise my walking tour** to compare with an automatically improved route.
8. Use the itinerary arrows to change the order; edit the name of any custom pin, or drag its marker to a new position.
9. Use **Share walk**, **Export JSON**, and **Open in Google Maps** to test your results.

**Why are some lines dashed?** The prototype relies on a public volunteer pedestrian-routing service. When it cannot route a walk, dashed lines and estimates are deliberately labelled approximate rather than pretending they are navigable walking paths.

**Why can I not click outside London?** The same Greater London coordinate bounds are enforced in the frontend and, in the Java version, on the server.

**Why can't I add a tenth stop?** There is a nine-stop cap to avoid excessive requests to a public demo server. You can raise this later when you use a production routing provider.
