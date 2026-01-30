# How to Create a Free Firebase Project with Storage

If you are seeing a billing prompt, it is likely because of the **Region** selection or the **Cloud Storage** bucket type.

Follow these steps exactly to ensure it is free:

1.  **Go to** [console.firebase.google.com](https://console.firebase.google.com/)
2.  Click **Add project**.
3.  Name it `salengman-v2` (or anything you like).
4.  **Disable Google Analytics** for this project (it simplifies setup).
5.  Click **Create project**.

### Enabling Storage (The Tricky Part)

6.  Once the project is ready, click **Build** -> **Storage** in the left menu.
7.  Click **Get started**.
8.  **Security Rules**: Select **Start in Test mode**. Click **Next**.
9.  **Cloud Storage Location** (CRITICAL):
    *   Do **NOT** choose "Multi-region" or "nam5 (us-central)".
    *   **Choose specifically**: `us-central1` (Iowa) or `asia-southeast1` (Singapore).
    *   *Note: If `us-central1` is not available, try `us-east1`.*

If you follow these steps, it **will** be free. The billing prompt only appears if you choose a premium multi-region location or if you accidentally click "Blaze plan" upgrade.
