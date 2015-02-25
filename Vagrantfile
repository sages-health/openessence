# -*- mode: ruby -*-
# vi: set ft=ruby :

# Vagrantfile to get Fracas running inside Docker containers inside a CoreOS VM.
# Adapted from https://github.com/coreos/coreos-vagrant
# See https://coreos.com/docs/running-coreos/platforms/vagrant for more information.

$vm_name = "openessence"

# See https://coreos.com/releases
$update_channel = "stable" # need Docker >= 1.3 for `docker create`

VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box = "coreos-%s" % $update_channel
  config.vm.box_version = ">= 472.0.0" # 472.0.0 is first release with Docker 1.3
  config.vm.box_url = "http://%s.release.core-os.net/amd64-usr/current/coreos_production_vagrant.json" % $update_channel

  # This is copied from core-os-vagrant. It probably works, but is totally untested.
  config.vm.provider :vmware_fusion do |vb, override|
    override.vm.box_url = "http://%s.release.core-os.net/amd64-usr/current/coreos_production_vagrant_vmware_fusion.json" % $update_channel
  end

  config.vm.provider :virtualbox do |v|
    # On VirtualBox, we don't have guest additions or a functional vboxsf
    # in CoreOS, so tell Vagrant that so it can be smarter.
    v.check_guest_additions = false
    v.functional_vboxsf = false
  end

  if Vagrant.has_plugin?("vagrant-vbguest") then
    config.vbguest.auto_update = false
  end

  config.vm.define vm_name = $vm_name do |config|
    config.vm.hostname = vm_name

    config.vm.provider :vmware_fusion do |vb|
      vb.gui = false
    end

    config.vm.provider :virtualbox do |vb|
      vb.gui = false
      vb.memory = 1024
      vb.cpus = 1 # We don't need >1, plus >1 gives a scary warning on host machines with 1 CPU

      # Set VirtualBox machine name. This means Vagrant will not append a timestamp to the VM name. This is more
      # user friendly and easier to document, at the cost of potential name conflicts.
      vb.name = $vm_name
    end

    # This would be great if it worked, but VirtualBox doesn't accurately export the network interface to OVF.
    # Feel free to uncomment if you're just using the vagrant box locally, but know that the network interface isn't
    # always preserved when you export an appliance, and it causes a scary warning when you import an appliance.
    # See https://www.virtualbox.org/ticket/7067
    #config.vm.network :private_network, ip: "172.17.8.101"

    # Forwarding ports could lead to port conflicts when users import our appliance. Hopefully, they're not running
    # a copy of Rails. If it becomes an issue, we can use more obscure port numbers.
    config.vm.network :forwarded_port, :guest => 9000, :host => 9000

    # Expose elasticsearch to the host. Useful to seed data from outside the VM
    #config.vm.network :forwarded_port, :guest => 9200, :host => 9200

    # Uncomment this to port forward to guest's Docker
    #config.vm.network "forwarded_port", guest: 2375, host: 2375, auto_correct: true

    # If we used something like NFS, it
    # 1. wouldn't work on every host and 2. wouldn't persist across guest restarts without Vagrant remounting it
    config.vm.synced_folder ".", "/home/core/fracas", :type => "rsync",
        :rsync__exclude => [".vagrant", ".git", "node_modules", "config/settings.js"]

    # Allow configuration of CoreOS via user-data. We don't currently use this, but it is useful to configure
    # etcd and fleet on a multi-node system.
    CLOUD_CONFIG_PATH = File.join(File.dirname(__FILE__), "vm/user-data")
    if File.exists?(CLOUD_CONFIG_PATH)
      config.vm.provision :file, :source => "#{CLOUD_CONFIG_PATH}", :destination => "/tmp/vagrantfile-user-data"
      config.vm.provision :shell, :inline => "mv /tmp/vagrantfile-user-data /var/lib/coreos-vagrant/",
                          :privileged => true
    end

    # Copy services from fracas-services container onto host
    # https://github.com/gabegorelick/fracas-services
    config.vm.provision :shell, :inline => "docker pull gabegorelick/fracas-services" # make sure image is up to date
    config.vm.provision :shell, :inline => "docker run --rm -v /home/core/services:/out gabegorelick/fracas-services sh -c 'cp /services/* /out'"

    # ##### (start) potential comment block###################################
    # Comment this out to revert to the settings in Gabe's fracas-services.
    # Changes from default:
    #    *) SESSION_SECRET is different
    #    *) APP_NAME       is defined
    #    *) PULL_IMAGE     is omitted to mark a local build process.
    #    *) IMAGE_NAME     is adjusted to mark a local build process.
    fracas_env = <<-END.gsub(/^\s+/, '')
      URL=http://localhost:9000
      USERS=false
      SESSION_SECRET=$UPER_DUPER_$ECRET
      APP_NAME=OpenESSENCE
      IMAGE_NAME=fracas
      WORKERS=1
      NODE_ENV=production
      SESSION_STORE=redis
    END
    config.vm.provision :shell, :inline => "echo '#{fracas_env}' > /home/core/services/fracas.env"
    # ##### (end) potential comment block#####################################

    # This is necessary if the service files have changed
    config.vm.provision :shell, :inline => "systemctl daemon-reload"

    # Install the services
    config.vm.provision :shell, :inline => "systemctl enable /home/core/services/*.service"

    # Build Fracas if we're not pulling it down
    build_fracas = <<-END
      source /home/core/services/fracas.env
      if [ "$PULL_IMAGE" == "" ]; then
        docker build -t $IMAGE_NAME /home/core/fracas
      fi
    END
    config.vm.provision :shell, :inline => build_fracas

    # systemd doesn't like it if you pass full paths to start (or restart), so we have to get fancy.
    # We use restart (as opposed to start) in case old versions of the services are already running.
    config.vm.provision :shell, :inline => "for f in /home/core/services/*.service; do systemctl restart $(basename $f .service); done"

    # You may want to restart CoreOS so that any services that got removed are shut down.
    # But that's best left as a manual process.

    # Seed elasticsearch. This won't work if clean or reseed depends on devDeps on other stuff that's not in the fracas
    # container. But the alternative is to have a separate fracas-tools container that would probably duplicate a lot
    # of what's in the fracas container. That may be best long term, but this works for now. And you can always seed
    # manually, e.g. from outside the VM.
    migrations_dir = "/code/server/migrations"
    reseed_command = "node #{migrations_dir}/clean && node #{migrations_dir}/reseed"
    seed_es = <<-END
      if [ $(systemctl show --property ActiveState elasticsearch) == 'ActiveState=failed' ]; then
        echo 'Elasticsearch failed to start. Not seeding.'
      else
        echo 'Waiting for elasticsearch...'
        until $(curl --output /dev/null --silent --head --fail http://localhost:9200); do
          sleep 1
        done
        echo 'Elasticsearch up and running. Reseeding now.'
        source /home/core/services/fracas.env
        docker run --rm --link elasticsearch:elasticsearch $IMAGE_NAME /bin/bash -c '#{reseed_command}'
      fi
    END

    config.vm.provision :shell, :inline => seed_es
  end
end
