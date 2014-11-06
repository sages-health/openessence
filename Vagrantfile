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

    # Expose elasticsearch to the host. Useful to seed data from outside the VM
    #config.vm.network :forwarded_port, :guest => 9200, :host => 9200

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

    # TODO put docker registry in VM

    start_service = lambda do |name|
      config.vm.provision :shell, :inline => "systemctl enable /home/core/share/vm/#{name}.service"
      config.vm.provision :shell, :inline => "systemctl start #{name}.service"
    end

    # Manually start these containers before fracas to give them time to fully initialize
    # (I'm bad at systemd)
    ["fracas-data", "elasticsearch", "redis"].each { |name|
      start_service.call(name)
    }

    # We build fracas here (instead of pulling it from Docker Hub) so you can tweak the app, e.g. build a VM from
    # a branch.
    config.vm.provision :shell, :inline => "docker kill fracas || true"
    config.vm.provision :shell, :inline => "docker rm fracas || true"
    config.vm.provision :shell, :inline => "docker build -t fracas /home/core/share"
    start_service.call("fracas")

    # Seed elasticsearch. This won't work if clean or reseed depends on devDeps on other stuff that's not in the fracas
    # container. But the alternative is to have a separate fracas-tools container that would probably duplicate a lot
    # of what's in the fracas container. That may be best long term, but this works for now. And you can always seed
    # manually, e.g. from outside the VM.
    migrations_dir = "/code/server/migrations"
    config.vm.provision :shell, :inline => "docker run --rm --link elasticsearch:elasticsearch fracas /bin/bash -c 'node #{migrations_dir}/clean; node #{migrations_dir}/reseed'"
  end
end
