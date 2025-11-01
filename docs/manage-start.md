# On-the-web start

The various things that the Fastly CLI does to set up this project, you can do yourself on the Fastly control panel.
See [Gradual start](gradual-start.md) for how to do it with the CLI if you don't mind setting that up.

(Steps are current as of 2025/10/29.)

1. Go to the "Create a Compute service" page https://manage.fastly.com/compute/new, click "Create an empty service."
1. (In your new _SUBDOMAIN_.edgecompute.app compute service with some subdomain _SUBDOMAIN_, in "Service configuration," in "Domains") copy the automatically generated _SUBDOMAIN_.edgecompute.app domain, paste it in the "Domain name of your website..." box, click "Add."
1. Click "KV stores" and click "Create KV store in Resources" and click "Create store," type `stuff`, click "Create."
1. Click "Add item," in "Key" type `admin/index.js`, click "Upload file," select your prepared admin/index.js file ([source](../init/admin/index.js), [preparation tool](https://squigil.edgecompute.app/admin-setup.html)), click "Save."
1. Click "Linked Services," "Link service," check your _SUBDOMAIN_.edgecompute.app (only click the checkbox, don't click the name, which is a link to the service page), click "Next," click "Link only."
1. Go back to your _SUBDOMAIN_.edgecompute.app compute service, click "Service configuration," click "Package," click "BROWSE FOR PACKAGE," select the prebuilt squigil.tar.gz file ([releases](https://github.com/wh0/squigil/releases)).
1. Click "Activate."

Then you'll have only the admin entrance script set up, which is just enough to set up editor and paste in the rest of the stuff.
