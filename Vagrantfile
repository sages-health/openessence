# -*- mode: ruby -*-
# vi: set ft=ruby :

# Vagrantfile to get Fracas running inside Docker containers inside a CoreOS VM.
# Adapted from https://github.com/coreos/coreos-vagrant
# See https://coreos.com/docs/running-coreos/platforms/vagrant for more information.

$vm_name = "corefracas"

# See https://coreos.com/releases
$update_channel = "alpha" # need Docker >= 1.3 for `docker create` TODO change to beta/stable when Docker 1.3 lands

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

    # Expose elasticsearch to the host. Useful to seed data. TODO: this might be a security risk.
    config.vm.network :forwarded_port, :guest => 9200, :host => 9200

    # Uncomment this to port forward to guest's Docker
    #config.vm.network "forwarded_port", guest: 2375, host: 2375, auto_correct: true

    # If we used something like NFS, it
    # 1. wouldn't work on every host and 2. wouldn't persist across guest restarts without Vagrant remounting it
    config.vm.synced_folder ".", "/home/core/share", :type => "rsync",
        :rsync__exclude => [".vagrant", ".git", "node_modules", "config/settings.js"]

    # Allow configuration of CoreOS via user-data. We don't currently use this, but it is useful to configure
    # etcd and fleet on a multi-node system.
    CLOUD_CONFIG_PATH = File.join(File.dirname(__FILE__), "vm/user-data")
    if File.exists?(CLOUD_CONFIG_PATH)
      config.vm.provision :file, :source => "#{CLOUD_CONFIG_PATH}", :destination => "/tmp/vagrantfile-user-data"
      config.vm.provision :shell, :inline => "mv /tmp/vagrantfile-user-data /var/lib/coreos-vagrant/",
                          :privileged => true
    end

    # Install service files. Without an [Install] section, all `systemctl enable` does is yell at you and symlink your
    # service into the systemd service directory. So we symlink the service files ourselves.
    ['fracas-data', 'elasticsearch', 'redis'].each { |name|
      service_file = "/home/core/share/vm/#{name}.service"
      config.vm.provision :shell, :inline => "ln -s #{service_file} /etc/systemd/system/#{name}.service",
                          :privileged => true
    }

    # TODO put docker registry in VM

    # We build fracas here (instead of pulling it from Docker Hub) so you can tweak the app, e.g. build a VM from
    # a branch.
    config.vm.provision :shell, :inline => "docker kill fracas || true"
    config.vm.provision :shell, :inline => "docker rm fracas || true"
    config.vm.provision :shell, :inline => "docker build -t fracas /home/core/share"

    # Use `systemctl enable` (instead of symlinking) since we want fracas to start on boot. All the other services
    # (fracas-data, elasticsearch, redis) don't directly start on boot. Instead, since fracas requires them, they start
    # when fracas starts. This makes sense since the other services aren't supposed to be general purpose system-wide
    # services, they're really just for fracas. But since fracas starts on boot, all the other services will start at
    # boot anyway, so it doesn't really matter.
    config.vm.provision :shell, :inline => "systemctl enable /home/core/share/vm/fracas.service"
    config.vm.provision :shell, :inline => "systemctl start fracas.service"

    # TODO seed data using fracas-tools container
  end
end
